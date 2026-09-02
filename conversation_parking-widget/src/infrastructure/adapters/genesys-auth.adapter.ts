/**
 * Genesys Cloud OAuth — Authorization Code Grant with PKCE + Popup Window
 *
 * Replaces the previous implicit grant flow.
 * Uses pop-up window for login, avoiding iframe restrictions.
 */

const TOKEN_KEY = 'genesys_token';
const ENVIRONMENT_KEY = 'genesys_environment';
const CODE_VERIFIER_KEY = 'pkce_code_verifier';

/** Timeout para esperar la respuesta del popup (ms) */
const POPUP_TIMEOUT_MS = 120_000; // 2 minutos

/** Ruta de la página callback del popup (servida desde /public) */
const POPUP_CALLBACK_PATH = '/auth-popup-callback.html';

// ---------------------------------------------------------------------------
// Helpers PKCE (crypto nativo del browser)
// ---------------------------------------------------------------------------

function generateCodeVerifier(length = 128): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array).slice(0, length);
}

async function computeCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Intercambio de code por token
// ---------------------------------------------------------------------------

async function exchangeCodeForToken(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
  environment: string,
): Promise<string> {
  const tokenUrl = `https://login.${environment}/oauth/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('No access_token in token response');
  }

  return data.access_token;
}

// ---------------------------------------------------------------------------
// Popup Auth
// ---------------------------------------------------------------------------

function authenticateViaPopup(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'genesys-auth-popup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!popup) {
      reject(
        new Error(
          'No se pudo abrir la ventana de autenticación. Verificá que los pop-ups estén habilitados.',
        ),
      );
      return;
    }

    const popupWindow: Window = popup;
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        popupWindow.close();
        reject(new Error('Timeout de autenticación. El usuario no completó el login a tiempo.'));
      }
    }, POPUP_TIMEOUT_MS);

    const pollId = setInterval(() => {
      if (popupWindow.closed && !resolved) {
        resolved = true;
        cleanup();
        reject(new Error('La ventana de autenticación fue cerrada antes de completar el login.'));
      }
    }, 500);

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'genesys-auth-popup-result') return;

      resolved = true;
      cleanup();
      popupWindow.close();

      if (event.data.error) {
        reject(new Error(`Autorización denegada: ${event.data.error}`));
      } else if (event.data.code) {
        resolve(event.data.code);
      } else {
        reject(new Error('Respuesta inesperada de la ventana de autenticación.'));
      }
    }

    function cleanup() {
      clearTimeout(timeoutId);
      clearInterval(pollId);
      window.removeEventListener('message', handleMessage);
    }

    window.addEventListener('message', handleMessage);
  });
}

// ---------------------------------------------------------------------------
// Validar token
// ---------------------------------------------------------------------------

/**
 * Validate token by calling Genesys Cloud `/api/v2/users/me?expand=groups`.
 * Returns user name, id, and group IDs.
 * Throws if validation fails.
 */
export async function validateToken(
  token: string
): Promise<{ name: string; id: string; groupIds: string[] }> {
  const environment = process.env.NEXT_PUBLIC_GENESYS_ENVIRONMENT;
  if (!environment) {
    throw new Error('NEXT_PUBLIC_GENESYS_ENVIRONMENT is not configured');
  }

  const response = await fetch(
    `https://api.${environment}/api/v2/users/me?expand=groups`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Token validation failed with status ${response.status}`);
  }

  const data = await response.json();

  console.log('[GenesysAuth] Agent info retrieved:', {
    name: data.name,
    id: data.id,
    groupIds: Array.isArray(data.groups) ? data.groups.map((g: { id: string }) => g.id) : [],
  });

  const groupIds: string[] = Array.isArray(data.groups)
    ? data.groups.map((g: { id: string }) => g.id)
    : [];

  return {
    name: data.name ?? '',
    id: data.id ?? '',
    groupIds,
  };
}

// ---------------------------------------------------------------------------
// Login con PKCE via popup (reemplaza extractToken + redirectToLogin)
// ---------------------------------------------------------------------------

/**
 * Authenticate using PKCE + Popup.
 * 1. If a token exists in localStorage, validates it.
 * 2. Otherwise opens popup for login via PKCE.
 * Returns the access token on success.
 * Throws on failure.
 */
export async function loginWithPKCE(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GENESYS_CLIENT_ID;
  const environment = process.env.NEXT_PUBLIC_GENESYS_ENVIRONMENT;

  if (!clientId || !environment) {
    throw new Error(
      'NEXT_PUBLIC_GENESYS_CLIENT_ID and NEXT_PUBLIC_GENESYS_ENVIRONMENT must be configured'
    );
  }

  localStorage.setItem(ENVIRONMENT_KEY, environment);

  // CASO 1: Hay token guardado → validar
  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (storedToken) {
    try {
      await validateToken(storedToken);
      return storedToken;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  // CASO 2: No hay token → iniciar flujo PKCE via popup
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await computeCodeChallenge(codeVerifier);

  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

  const popupRedirectUri = `${window.location.origin}${POPUP_CALLBACK_PATH}`;

  const authUrl =
    `https://login.${environment}/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(popupRedirectUri)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}`;

  const authCode = await authenticateViaPopup(authUrl);

  const token = await exchangeCodeForToken(
    authCode,
    clientId,
    popupRedirectUri,
    codeVerifier,
    environment,
  );

  sessionStorage.removeItem(CODE_VERIFIER_KEY);
  localStorage.setItem(TOKEN_KEY, token);

  return token;
}

// ---------------------------------------------------------------------------
// Legacy compatibility exports (kept for existing consumers)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use loginWithPKCE() instead. Kept for backward compatibility.
 * Extracts token from localStorage only (no longer parses URL hash).
 */
export function extractToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * @deprecated Use loginWithPKCE() instead.
 * No longer redirects — throws an error directing to use PKCE flow.
 */
export function redirectToLogin(): void {
  throw new Error(
    'redirectToLogin() is deprecated. Use loginWithPKCE() for PKCE popup auth instead.'
  );
}

/**
 * Remove token from localStorage.
 */
export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ENVIRONMENT_KEY);
  }
}
