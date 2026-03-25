---
id: "db-cognition-queue"
type: "core"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/fluxcore-cognition.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: fluxcore_cognition_queue

## 🎯 Propósito
Cola de turnos cognitivos. Agrupa mensajes recibidos en una ventana temporal (`turn_window`) para que el CognitionWorker los procese como un lote coherente, evitando respuestas duplicadas por ráfagas de mensajes.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | BIGSERIAL | PK secuencial. |
| `conversation_id` | UUID | Conversación objetivo. |
| `account_id` | UUID | Cuenta dueña del asistente. |
| `turn_window_expires_at` | TIMESTAMP | Momento en que el turno se cierra y el worker lo procesa. |
| `processed_at` | TIMESTAMP | NULL = pendiente. Valor = ya procesado. |
| `attempts` | INTEGER | Reintentos en caso de fallo. |

## 🧬 Relaciones (Connections)
- Consumido por el **CognitionWorker** (polling basado en `turn_window_expires_at`).
- Alimentado por el **ChatProjector** cuando proyecta una señal entrante.

## 🛡️ Invariantes (Operations)
1. **Unique Pending**: El índice `ux_cognition_queue_pending_conversation` garantiza que solo exista **un turno pendiente por conversación** (evita duplicados).
2. **Partial Index**: `idx_cognition_queue_ready` solo indexa filas con `processed_at IS NULL`, optimizando el polling del worker.
3. **at-least-once delivery**: Si el worker falla, el turno permanece con `processed_at = NULL` para ser reintentado.

## 💡 Ejemplo de Uso
```typescript
// Poll de turnos listos para procesar (CognitionWorker)
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const readyTurns = await db.execute(
  sql`SELECT * FROM fluxcore_cognition_queue
       WHERE processed_at IS NULL
       AND turn_window_expires_at <= clock_timestamp()
       LIMIT 10`
);
```
