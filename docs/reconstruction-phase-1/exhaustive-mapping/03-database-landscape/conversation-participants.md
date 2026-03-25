---
id: "db-conversation-participants"
type: "database-table"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/conversation-participants.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de unión conversaciones-actores" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Conversations, Actors" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Access Control & Presence" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Uniqueness per account/conv, Subscription tracking, Role assignment" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: conversation_participants

## 🎯 Propósito
Esta tabla de unión define quién tiene acceso a qué hilos de conversación. Facilita las consultas de "mis chats" y gestiona la suscripción temporal a eventos de tiempo real para cada participante.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID del registro de participación. |
| `conversation_id` | UUID | FK (conversations.id) | Conversación vinculada. |
| `actor_id` | UUID | FK (actors.id) | Referencia ontológica al participante. |
| `account_id` | TEXT | Not Null | ID de cuenta (para filtros rápidos). |
| `role` | VARCHAR(20) | Check Constraint | `initiator`, `recipient`, `observer`. |
| `identity_type` | VARCHAR(20) | Default 'registered'| `registered`, `anonymous`, `system`. |
| `subscribed_at` | TIMESTAMP | Not Null | Cuándo se unió el participante. |

## 🧬 Relaciones (Connections)
-   **Strict Uniqueness**: Existe un `uniqueIndex` sobre `(conversation_id, account_id)`, impidiendo que una cuenta tenga múltiples roles o registros de participación en el mismo hilo.

## 🛡️ Reglas de Negocio (Operations)
1.  **Ciclo de Vida**: El campo `unsubscribed_at` permite marcar cuándo un participante abandonó un chat (ej: un bot que terminó su tarea o un agente que transfirió el ticket).
2.  **Observers**: El rol `observer` (observador) permite que una extensión o un supervisor vea los mensajes en tiempo real sin ser contabilizado como un participante activo para la lógica de "visto" o notificaciones push.
3.  **Aceleración**: El `account_id` se mantiene como texto (denormalizado) para permitir que el router de la API filtre participaciones sin necesidad de resolver siempre el actor ontológico.

## 💡 Ejemplo de Uso
```typescript
// Obtener participantes de una conversación
import { db, conversationParticipants } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const participants = await db.select()
  .from(conversationParticipants)
  .where(eq(conversationParticipants.conversationId, convId));
```
