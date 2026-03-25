---
id: "conversations-routes"
type: "api-routes"
status: "stable"
criticality: "critical"
location: "apps/api/src/routes/conversations.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ConversationService, MessageService, AccountService, ChatCoreWebchatGateway" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Ciclo de Vida de Conversaciones" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conversation listing with account filtering, Message retrieval with cursor-pagination, Visitor conversion to real relationship, Chat clearing (actor-based), Conversation archival/soft-delete" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Conversations Routes

## 🎯 Propósito
Las `Conversations Routes` son el núcleo de la navegación en FluxCore. Gestionan el ciclo de vida de los hilos de chat, desde que se inician (por un humano o un visitante anónimo) hasta que se archivan o se eliminan, controlando la visibilidad de los mensajes para cada participante.

## 🚥 Navegación Eficiente
-   **Cursor-Based Pagination**: El endpoint de mensajes utiliza un cursor temporal para cargar el historial, permitiendo un scroll infinito suave y evitando el rendimiento degradado de los offsets tradicionales.
-   **Filtrado por Cuenta**: Soporta el modo multi-cuenta, permitiendo listar conversaciones de una cuenta específica o de todas las cuentas pertenecientes al usuario.

## 🧬 Conversión de Visitantes
Incluye el endpoint crítico `/convert-visitor`, que maneja la transición de un usuario que chatea anónimamente en la web hacia una identidad real autenticada. Este proceso certifica el vínculo de identidad y migra el historial previo hacia la nueva relación soberana.

## 🛡️ Privacidad y Visibilidad
Implementa una lógica de visibilidad basada en el actor:
-   **Clear Chat**: Permite ocultar el historial para un participante sin afectar lo que ve el otro (borrado asimétrico).
-   **Status Checks**: Valida en cada paso que el usuario tiene acceso legítimo a la conversación solicitada, ya sea como propietario o como participante activo.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './conversations.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/conversations', router);
```
