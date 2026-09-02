"use client";

import { useState, useEffect } from "react";
import type { AuthState } from "../../domain/entities/auth";
import {
  loginWithPKCE,
  validateToken,
  clearToken,
} from "../../infrastructure/adapters/genesys-auth.adapter";

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  token: null,
  agent: null,
  agentGroupIds: null,
  error: null,
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function authenticate() {
      try {
        const token = await loginWithPKCE();

        if (cancelled) return;

        const { name, id, groupIds } = await validateToken(token);
        console.log(`[useAuth] Agent "${name}" (id: ${id}) — groupIds:`, groupIds);

        if (cancelled) return;

        setState({
          isAuthenticated: true,
          isLoading: false,
          token,
          agent: { name, id },
          agentGroupIds: groupIds,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;

        clearToken();

        setState({
          isAuthenticated: false,
          isLoading: false,
          token: null,
          agent: null,
          agentGroupIds: null,
          error: err instanceof Error ? err.message : "Authentication failed",
        });
      }
    }

    authenticate();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
