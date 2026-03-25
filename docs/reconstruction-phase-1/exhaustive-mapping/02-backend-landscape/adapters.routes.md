---
id: "adapters-routes"
type: "backend-route"
status: "stable"
criticality: "critical"
location: "apps/api/src/routes/adapters.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Adapter Manager, Message Core, World Definer, Meta Webhooks" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gateway de Canales Externos (Omnicanalidad)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Webhook handling, Message ingestion, Outbound sending, Status monitoring" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AdaptersRoutes

## 🎯 Propósito
Este componente es el puente de entrada y salida entre FluxCore y el mundo exterior (WhatsApp, Telegram, etc.). Gestiona la normalización de mensajes entrantes y la orquestación de envíos salientes a través de diversos proveedores.

## 🌐 Gestión de Webhooks (WhatsApp/Meta)
- **Verificación:** Maneja el protocolo de "Handshake" de Meta usando el `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- **Ingesta:** Recibe payloads binarios/JSON de Meta, los normaliza mediante el `AdapterManager` y los inyecta en el motor `MessageCore`.

## 🧠 Resolución de Contexto (World Definer)
Una característica crítica es el uso del `ChatCoreWorldDefiner` para inferir el canal y el contexto de un mensaje incluso cuando el payload externo es ambiguo. Esto permite que el sistema decida qué políticas de IA aplicar antes de que el mensaje llegue a la base de datos.

## 🛠️ Endpoints
- **`GET /status`**: Resumen público de qué canales están configurados y activos (WhatsApp, etc.).
- **`POST /:channel/send`**: Punto de entrada para el envío manual o programado de mensajes hacia canales externos. Requiere autenticación de usuario.
- **`GET /:channel/status`**: Estado detallado de conexión de un adaptador específico.

## 🔄 Flujo de Entrada (RFC-0001)
Cuando un mensaje llega de un adaptador, no se guarda directamente. Se pasa al `messageCore.receiveFromAdapter`, el cual se encarga de la identificación del actor, la gestión de la conversación y la activación de la IA si corresponde.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './adapters.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/adapters', router);
```
