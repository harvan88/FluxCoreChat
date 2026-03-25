---
id: "db-automation-rules"
type: "core"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/automation-rules.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: automation_rules (COR-007)

## 🎯 Propósito
Define las reglas de automatización por cuenta/relación. Controla los modos `auto` (IA responde sola), `suggest` (IA sugiere, humano aprueba), `off` (IA desactivada). Es la piedra angular del **PolicyContext**.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `account_id` | UUID | FK → accounts. Scope de la regla. |
| `relationship_id` | UUID / NULL | FK → relationships. Si es NULL, es la regla global de la cuenta. |
| `mode` | VARCHAR(20) | `auto`, `suggest`, `off`. |
| `config` | JSONB | Triggers, conditions, delay, rateLimit. |

## 🧬 Cascada de Resolución (Connections)
1. El `FluxPolicyContextService` busca primero una regla **específica** para la relación.
2. Si no encuentra, toma la regla **global** de la cuenta (`relationship_id = NULL`).
3. Si no existe ninguna, aplica el default del sistema (`suggest`).

## 🔗 Dependencias
- **PolicyContextService**: Principal consumidor.
- **Scheduler Worker**: Evalúa los triggers schedule recurrentes.

## 🛡️ Reglas de Operación (Operations)
1. **Triggers**: Soporta `message_received`, `keyword`, `schedule`, `webhook`.
2. **Conditions**: Filtros por `message_type`, `sender`, `time_of_day`, `message_content`.
3. **Rate Limiting**: El campo `config.rateLimit` previene ráfagas de respuestas automáticas.

## 💡 Ejemplo de Uso
```typescript
// Resolver modo de automatización para una cuenta
import { db, automationRules } from '@fluxcore/db';
import { eq, and, isNull } from 'drizzle-orm';

const [globalRule] = await db.select()
  .from(automationRules)
  .where(and(
    eq(automationRules.accountId, accountId),
    isNull(automationRules.relationshipId)
  )).limit(1);
```
