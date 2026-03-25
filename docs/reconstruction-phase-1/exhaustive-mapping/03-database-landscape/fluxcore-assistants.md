---
id: "db-fluxcore-assistants"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/fluxcore-assistants.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Configuración de asistentes individuales" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Accounts. Vinculado N:M con Instructions y VectorStores" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AI Assistant Management" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Model parameterization (Temp/TopP), Timing control (Smart Delay), Token usage tracking, Provider runtime selection" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: fluxcore_assistants

## 🎯 Propósito
Define las instancias de asistentes de IA disponibles para cada cuenta. Un asistente es una configuración específica de modelo, personalidad y parámetros que puede ser invocado directamente en un chat o ser parte de un Flujo de Agente.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID del asistente. |
| `account_id` | UUID | Not Null | Cuenta dueña del asistente. |
| `name` | VARCHAR(255) | Not Null | Nombre descriptivo. |
| `status` | VARCHAR(20) | Default 'draft' | `draft`, `production`, `disabled`. |
| `runtime` | VARCHAR(20) | Default 'local' | `local` (Kernel) o `openai` (Assistant API). |
| `model_config` | JSONB | Not Null | `{ provider, model, temperature, topP, tone, etc }`. |
| `timing_config` | JSONB | Not Null | `{ responseDelaySeconds, smartDelay }`. |

## 🧬 Relaciones (Connections)
-   **N:M Instructions**: Un asistente puede tener múltiples instrucciones de sistema (vía `fluxcore_assistant_instructions`).
-   **N:M Vector Stores**: Un asistente puede acceder a múltiples bases de conocimiento (vía `fluxcore_assistant_vector_stores`).
-   **Agents**: Los asistentes actúan como "trabajadores" dentro de los pasos de un `fluxcore_agent`.

## 🛡️ Reglas de Comportamiento (Operations)
1.  **Antropomorfismo Controlado**: El `timing_config` permite simular un tiempo de respuesta "humano" (`smartDelay`), evitando respuestas instantáneas que rompan la experiencia de usuario.
2.  **Soberanía de Datos**: Si el `runtime` es `local`, el Kernel de FluxCore procesa todo. Si es `openai`, el asistente se sincroniza con la API de OpenAI (usando `external_id`).
3.  **Auditoría de Uso**: La columna `tokens_used` permite monitorizar el consumo acumulado de este asistente específico para detectar desviaciones en el presupuesto de créditos de la cuenta.

## 💡 Ejemplo de Uso
```typescript
// Obtener asistente activo de una cuenta
import { db, fluxcoreAssistants } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

const [assistant] = await db.select()
  .from(fluxcoreAssistants)
  .where(and(
    eq(fluxcoreAssistants.accountId, accountId),
    eq(fluxcoreAssistants.status, 'production')
  )).limit(1);
```
