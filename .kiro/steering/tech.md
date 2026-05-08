# Stack Tecnológico

## Framework y Runtime

- **Next.js 16** (App Router) con React 19
- **TypeScript 5** (modo estricto habilitado)
- **Tailwind CSS 4** para estilos

## Testing

- **Vitest 4** como test runner (entorno jsdom)
- **@testing-library/react** para tests de componentes
- **fast-check** para property-based testing
- **msw** (Mock Service Worker) para mocking de APIs en tests

## Build y Desarrollo

- **ESLint 9** con eslint-config-next

## Comandos Comunes

Todos los comandos se ejecutan desde el directorio `conversation_parking-widget/`:

```bash
npm run dev      # Servidor de desarrollo (localhost:3000)
npm run build    # Build de producción
npm run lint     # Ejecutar ESLint
npm run test     # Ejecutar tests (vitest --run, ejecución única)
```

## Alias de Rutas

- `@/*` mapea a la raíz del proyecto (configurado en tsconfig.json y vitest.config.ts)

## Integraciones Externas

- **Genesys Cloud** — Autenticación y datos de grupos de agentes
- **Xlink API** — Gestión de números telefónicos/canales, estado de interacciones
- Las llamadas a APIs se proxean a través de rutas API de Next.js (`/api/proxy-*`) para evitar problemas de CORS
