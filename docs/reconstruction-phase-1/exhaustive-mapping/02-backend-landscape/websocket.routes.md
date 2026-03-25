---
id: "websocket-routes"
type: "api-infrastructure"
status: "ratified"
criticality: "medium"
location: "apps/api/src/routes/websocket.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Elysia WS Server" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Entrada de Comunicación en Tiempo Real" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WebSocket route registration, Connection lifecycle anchoring, Real-time event propagation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Websocket Routes

## 🎯 Propósito
Este archivo sirve como el punto de anclaje para las capacidades de comunicación en tiempo real dentro del router de Elysia. Aunque la lógica pesada de los sockets reside en el núcleo del servidor, este archivo garantiza que la ruta de WebSockets esté correctamente integrada en la estructura jerárquica de la API de FluxCore.

## 🚥 Integración de Tiempo Real
Su función principal es exportar una instancia de Elysia dedicada a los sockets, permitiendo:
-   **Broadcast de Mensajes**: Notificación instantánea de nuevos mensajes en conversaciones.
-   **Presencia y Actividad**: Señales de "escribiendo..." y estados de conexión (On/Off).
-   **Sincronización de UI**: Notificación de cambios en el estado de tareas (WES).

## 🧬 Desacoplamiento de Servidor
Al estar separado del código principal del servidor, permite escalar la gestión de sockets de forma independiente si fuera necesario, facilitando la adición de middleware específico para WebSockets (como validación de tokens de corta duración) sin contaminar las rutas HTTP tradicionales.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './websocket.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/websocket', router);
```
