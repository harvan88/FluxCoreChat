---
id: "db-conversations"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/conversations.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de hilos de comunicación" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Relationships, Accounts. Referenciada por Messages, Participants" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Messaging Engine" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Denormalization (Last message), Type/Channel filtering, Frozen state management, Visitor token indexing" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: conversations

## 🎯 Propósito
La tabla `conversations` agrupa los mensajes en hilos lógicos. Soporta diferentes naturalezas de comunicación: desde chats privados entre dos usuarios hasta hilos anónimos iniciados desde un widget web.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID del hilo de conversación. |
| `relationship_id` | UUID | FK (relationships.id) | Vínculo social opcional (obligatorio para chats directos). |
| `owner_account_id`| UUID | FK (accounts.id) | Cuenta dueña del canal (ej: el negocio en WhatsApp). |
| `conversation_type`| VARCHAR(32) | Check Constraint | `internal`, `anonymous_thread`, `external`. |
| `channel` | VARCHAR(32) | Check Constraint | `web`, `whatsapp`, `telegram`, `webchat`. |
| `status` | VARCHAR(20) | Default 'active' | `active`, `archived`, `closed`. |
| `last_message_at` | TIMESTAMP | Denormalized | Fecha del último mensaje (para ordenamiento). |
| `frozen_at` | TIMESTAMP | Nullable | Fecha en que se pausó la conversación por IA/Sistema. |

## 🧬 Relaciones (Connections)
-   **Participants**: Una conversación tiene N participantes (usualmente 2, pero soporta grupos).
-   **Messages**: Contenedor principal de los mensajes.
-   **Identity Linking**: Si es un `anonymous_thread`, el campo `visitor_token` permite recuperar la sesión del usuario en el widget.

## 🛡️ Reglas de Negocio (Operations)
1.  **Congelación (Freeze)**: Soporta el estado `frozen_at`. Una conversación congelada impide que el usuario envíe mensajes mientras la IA procesa o un humano interviene (Evita race conditions).
2.  **Rendimiento**: Incluye columnas desnormalizadas (`last_message_text`, `last_message_at`) para permitir listas de chats rápidas sin necesidad de joins complejos con la tabla de mensajes.
3.  **Vínculo Anon-Real**: Mediante `identity_linked_at`, el sistema marca cuándo un hilo anónimo fue asociado formalmente a una cuenta de usuario real.

## 💡 Ejemplo de Uso
```typescript
// Listar conversaciones activas de una cuenta
import { db, conversations } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';

const active = await db.select()
  .from(conversations)
  .where(and(
    eq(conversations.accountId, accountId),
    eq(conversations.status, 'active')
  ))
  .orderBy(desc(conversations.lastMessageAt));
```
