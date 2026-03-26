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
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conversation listing with account filtering, Message retrieval with cursor-pagination, Visitor conversion to real relationship, Pagination fix" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Conversations Routes

## 🎯 Propósito
Las `Conversations Routes` gestionan el ciclo de vida de los hilos de chat, desde que se inician hasta que se archivan o se eliminan, controlando la visibilidad de los mensajes para cada participante.

## 🚥 Navegación y Paginación (Fix v8.3)
Implementa un sistema de **Cursor-Based Pagination** para el historial de mensajes:
-   **Endpoint**: `GET /api/conversations/:id/messages`
-   **Lógica Corregida**: Se ajustó el valor del `nextCursor` devuelto en la respuesta. 
    - **Antes**: Apuntaba al mensaje más reciente del batch recibido.
    - **Ahora**: Apunta al mensaje más antiguo (`messages[0].createdAt`), permitiendo que el scroll infinito cargue correctamente los bloques de mensajes anteriores en el tiempo.

## 🧬 Conversión de Visitantes
Maneja la transición de un usuario anónimo (webflow) hacia una identidad autenticada, migrando el historial previo y certificando el nuevo vínculo de identidad soberana.

## 🛡️ Privacidad y Visibilidad
-   **Status Checks**: Valida en cada paso que el usuario tiene acceso legítimo.
-   **Asymmetric Clear**: Permite que un actor oculte su historial individual sin afectar al otro usuario de la misma conversación (mediante la integración con `MessageDeletionService`).

## 💡 Ejemplo de Uso
```typescript
import { conversationsRouter } from './routes/conversations.routes';

// Endpoint típico de mensajes con cursor
// GET /api/conversations/:id/messages?limit=50&cursor=2024-03-26T12:00:00Z
```
