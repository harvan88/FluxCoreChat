---
id: "db-fluxcore-agents"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/fluxcore-agents.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de definición de agentes (Fase 3)" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Accounts, Assistants. Orquestador de flujos cognitivos" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agent Runtime Engine" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Flow-based step execution, Security scope enforcement, Multi-assistant role assignment (N:M)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Tables: fluxcore_agents_cluster

## 🎯 Propósito
Este conjunto de tablas define la arquitectura de "Agentes" de FluxCore. Un Agente es una entidad superior a un Asistente; es una composición orquestada de múltiples asistentes, herramientas y lógica determinista que sigue un flujo de trabajo (Flow) específico.

## 🚥 Estructura (Discovery)

### `fluxcore_agents`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | ID del agente. |
| `flow` | JSONB | **Definición del Grafo**. Contiene el array de pasos (`AgentFlowStep`). |
| `scopes` | JSONB | **Límites de Seguridad**. Tokens máx, tiempo máx, modelos permitidos. |
| `trigger_config` | JSONB | Qué dispara al agente (`message_received`, `webhook`, etc.). |

### `fluxcore_agent_assistants` (N:M)
Vincula agentes con los asistentes de bajo nivel (`fluxcore_assistants`).
-   `role`: El papel del asistente en el flujo (`worker`, `router`, `reviewer`).
-   `step_id`: El ID del paso en el JSON `flow` donde este asistente es invocado.

## 🧬 Anatomía del Flow (Connections)
El campo `flow` mapea una secuencia de pasos (`steps`):
1.  **Type**: `llm`, `rag`, `deterministic`, `tool`, `router`, `human-in-loop`.
2.  **Condition**: Expresiones para ramificación lógica (ej: `{{ intent == 'queja' }}`).
3.  **Inputs**: Mapeo de variables desde el ContextBus (ej: `{{ trigger.content }}`).

## 🛡️ Gobernanza de Ejecución (Operations)
1.  **Enforcement de Scopes**: Antes de cada paso, el orquestador valida que el agente no haya excedido el `maxTotalTokens` o el `maxExecutionTimeMs` definidos en la tabla.
2.  **Human-in-the-loop**: El paso tipo `human-in-loop` pausa la ejecución del agente y guarda el estado hasta que un usuario autoriza el siguiente paso, reflejándose en el estado `status` del agente.
3.  **Aislamiento de Cuentas**: Los agentes están anclados a una `accountId`, impidiendo que flujos de un cliente accedan a asistentes o herramientas de otro.

## 💡 Ejemplo de Uso
```typescript
// Cargar agente con sus asistentes
import { db, fluxcoreAgents } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const [agent] = await db.select()
  .from(fluxcoreAgents)
  .where(eq(fluxcoreAgents.id, agentId))
  .limit(1);
```
