# Descripción del Producto

Conversation Parking Widget es un widget web construido con Next.js para gestionar interacciones de mensajería (WhatsApp) en un entorno de contact center. Se integra con las APIs de Genesys Cloud y Xlink.

## Funcionalidad Principal

- Mostrar interacciones de mensajería activas (conversaciones) para las líneas telefónicas del agente
- Parquear y desparquear conversaciones (retener/reanudar temporalmente)
- Filtrar interacciones por línea del agente
- Enviar mensajes de plantilla a conversaciones parqueadas
- Seguimiento en tiempo real de la duración de conversaciones activas

## Contexto del Dominio

- **Interacciones**: Conversaciones de mensajería entre agentes y clientes, identificadas por líneas de origen/destino
- **Líneas**: Números telefónicos asociados a grupos de agentes en Genesys Cloud
- **Parqueo**: Retener temporalmente una conversación para que otro agente o el mismo pueda retomarla después
- **Plantillas**: Mensajes pre-aprobados que se pueden enviar para re-enganchar conversaciones parqueadas

## Idioma de la UI

La interfaz usa etiquetas en español (ej: "Parqueada", "Activa", "Líneas", etc.).
