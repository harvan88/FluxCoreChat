---
id: "db-messages"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/messages.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de eventos de comunicación" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Conversations, Actors, Users. Referenciada por MessageEnrichments" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Message Core & History" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Versioning (Immutability), Signal alignment (Kernel), Content verification, Rich media support" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: messages

## 🎯 Propósito
La tabla `messages` registra cada átomo de comunicación en FluxCore. Está diseñada para ser inmutable mediante versionamiento y para estar alineada con el despacho de señales del Kernel.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID físico del mensaje. |
| `conversation_id` | UUID | FK (conversations.id) | Hilo al que pertenece. |
| `sender_account_id`| TEXT | Not Null | ID de la cuenta que envía (legacy compat). |
| `from_actor_id` | UUID | FK (actors.id) | **Actor Ontológico** que origina el mensaje. |
| `content` | JSONB | Not Null | Payload: `{ text, media, location, buttons }`. |
| `type` | VARCHAR(20) | Not Null | `incoming`, `outgoing`, `system`. |
| `generated_by` | VARCHAR(20) | Not Null | `human`, `ai`, `system`. |
| `signal_id` | BIGINT | Unique Index | **ID de Kernel**. Alineación con el Dispatcher. |
| `version` | INTEGER | Default 1 | Control de ediciones (v8.x). |

## 🧬 Relaciones (Connections)
-   **Ancestry**: Soporta `parent_id` (hilos/respuestas) y `original_id` (para mensajes editados o versionados).
-   **Enrichments**: Extensiones pueden adjuntar metadatos extra en la tabla dependiente `message_enrichments`.
-   **Assets**: Los archivos adjuntos en el JSON `content` deben estar registrados en la tabla `assets`.

## 🛡️ Reglas de Negocio (Operations)
1.  **Soberanía del Kernel**: El `signal_id` es el vínculo único con el "diario de realidad" del sistema. No puede haber dos mensajes con el mismo ID de señal.
2.  **Garantía de Contenido**: Un Check Constraint (`message_has_content`) asegura que un mensaje tenga texto, o media, o sea un evento de sistema/reacción. No se permiten mensajes vacíos.
3.  **Aprobación IA**: Los mensajes con `generated_by = 'ai'` pueden tener un `ai_approved_by` (ID de usuario), indicando que un humano supervisó y validó la respuesta antes de enviarla.

## 💡 Ejemplo de Uso
```typescript
// Obtener historial de mensajes de una conversación
import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

const history = await db.select()
  .from(messages)
  .where(eq(messages.conversationId, conversationId))
  .orderBy(desc(messages.createdAt))
  .limit(50);
```
