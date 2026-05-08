# Estructura del Proyecto

El proyecto vive en `conversation_parking-widget/` y sigue un patrón de **Arquitectura Hexagonal** (Puertos y Adaptadores).

## Layout del Código Fuente (`src/`)

```
src/
├── domain/           # Lógica de negocio central, sin dependencias externas
│   ├── entities/     # Interfaces TypeScript para modelos de dominio (Interaction, Line, etc.)
│   └── ports/        # Interfaces (contratos) que la infraestructura debe implementar
├── application/      # Lógica de aplicación que orquesta dominio e infraestructura
│   ├── hooks/        # React hooks (useAuth, useInteractions, useAgentLines)
│   └── use-cases/    # Funciones de lógica de negocio puras (consolidateLines, etc.)
├── infrastructure/   # Integraciones con sistemas externos
│   ├── adapters/     # Transformación de datos (respuesta API → entidades de dominio)
│   ├── services/     # Implementaciones de puertos (RealInteractionService, MockInteractionService)
│   └── config/       # Service registry / inyección de dependencias
└── presentation/     # Capa de UI
    ├── components/   # Componentes React (funcionales, "use client" donde sea necesario)
    └── providers/    # Proveedores de contexto React
```

## App Router (`app/`)

```
app/
├── page.tsx                    # Punto de entrada principal, renderiza el widget
├── layout.tsx                  # Layout raíz
├── api/
│   ├── proxy-channels/         # GET — obtener canales disponibles
│   ├── proxy-group-phones/     # GET — obtener números telefónicos de un grupo
│   ├── proxy-interactions/     # GET — obtener interacciones de una línea
│   └── send-template/          # POST — enviar mensaje de plantilla
```

## Tests (`__tests__/` y co-ubicados)

- Tests unitarios co-ubicados junto a los archivos fuente (ej: `consolidate-lines.test.ts`)
- Tests de propiedades (property-based) en `__tests__/` (ej: `basic-auth.property.test.ts`)
- Tests de rutas API en `__tests__/api/`

## Reglas de Arquitectura

1. **El dominio no tiene dependencias** de infraestructura ni presentación.
2. **Los puertos** definen interfaces; **los servicios** las implementan.
3. **Los adaptadores** son funciones puras que transforman datos externos en entidades de dominio.
4. **El service registry** (`infrastructure/config/service-registry.ts`) actúa como contenedor DI simple — se intercambian implementaciones cambiando el registry.
5. **Las rutas API** son proxies delgados que reenvían peticiones a servicios externos, manteniendo secretos del lado del servidor.
6. Los componentes usan la directiva `"use client"` solo cuando necesitan interactividad del lado del cliente.
