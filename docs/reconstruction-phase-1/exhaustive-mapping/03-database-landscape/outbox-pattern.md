---
id: "db-outbox-pattern"
type: "core"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/chatcore-outbox.ts, packages/db/src/schema/fluxcore-outbox.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Schema Cluster: Outbox Pattern (Transactional Guarantee)

## 🎯 Propósito
Implementa el **Transactional Outbox Pattern** para garantizar entrega confiable de eventos entre subsistemas, incluso ante fallos de red o del proceso.

## 🚥 Componentes (Discovery)

### 1. `chatcore_outbox`
Garantiza que cada mensaje persistido por ChatCore sea certificado en el Kernel.
- **FK**: `message_id` → `messages.id`.
- **Status**: `pending` → `processing` → `sent`.

### 2. `fluxcore_outbox`
Garantiza que cada evento del Kernel sea entregado a suscriptores (Projectors).
- **Ref**: `signal_id` (bigint, referencia lógica a `fluxcore_signals.sequence_number`).
- **Status**: `pending` → `processing` → `sent`.

## 🧬 Flujo del Patrón (Connections)
1. Un servicio escribe datos + entrada de outbox **en la misma transacción**.
2. Un worker periódico lee las entradas `pending`.
3. Las entrega al destino y marca como `sent`.
4. Si falla, incrementa `attempts` y guarda `last_error`.

## 🔗 Dependencias
- **Outbox Worker**: Lee las filas y las procesa en orden asc de creación.
- **Kernel / WebSocket server**: Quienes finalmente ingieren o notifican el objeto final.

## 🛡️ Garantías (Operations)
1. **Atomicidad**: La entrada de outbox se crea en la misma TX que el dato original.
2. **Índice Partial**: `idx_*_pending` sobre `(status, created_at)` para polling O(1).
3. **Idempotencia**: El consumidor debe tolerar entregas duplicadas (at-least-once).

## 💡 Ejemplo de Uso
```typescript
// Procesar entradas pendientes del outbox
import { db, chatcoreOutbox } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const pending = await db.select()
  .from(chatcoreOutbox)
  .where(eq(chatcoreOutbox.status, 'pending'))
  .limit(50);
```
