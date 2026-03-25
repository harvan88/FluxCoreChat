---
id: "db-wes-system"
type: "database-schema-cluster"
status: "ratified"
criticality: "critical"
location: "packages/db/src/schema/wes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Esquema consolidado del Work Execution System" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FKs circulares entre Works/Events/Slots. Conectado a Accounts y Relationships" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Transactional Automation Engine (WES)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Finite State Machine persistence, Slot-based data collection, Decision trace auditing, Semantic confirmation lifecycle" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Schema Cluster: WES System (Work Execution System)

## 🎯 Propósito
Este cluster de tablas gestiona la ejecución de tareas transaccionales de negocio. A diferencia del chat convencional, el sistema WES sigue máquinas de estado finitas (FSM) y requiere recolección de datos obligatorios (slots) antes de ejecutar efectos externos.

## 🚥 Componentes Principales (Discovery)

### 1. `fluxcore_work_definitions`
Cátalogo de tipos de trabajo (Ventas, Soporte, etc.). Almacena el esquema de datos (`definition_json`) y las políticas de ejecución. Soporta versionamiento SemVer.

### 2. `fluxcore_proposed_works`
Hito de pre-ejecución. Registra intenciones detectadas por la IA con un puntaje de `confidence`. Requiere resolución del usuario (`opened` o `discarded`).

### 3. `fluxcore_works`
La entidad activa de trabajo.
-   `state`: Estado actual en la FSM (`ACTIVE`, `COMPLETED`, etc.).
-   `aggregate_key`: Permite agrupar trabajos por criterios de negocio.
-   `revision`: Contador para optimismo concurrente.

### 4. `fluxcore_work_slots`
Celdas de datos recolectados para un trabajo.
-   `status`: `proposed` (por IA) o `committed` (confirmado).
-   `evidence`: JSON con el fragmento de texto que justifica el valor del slot.
-   `semantic_confirmed_at`: Marca de tiempo de confirmación humana/semántica.

### 5. `fluxcore_decision_events` & `fluxcore_work_events`
El audit log completo. `decision_events` registra el pensamiento del LLM (inputs, tokens, latencia), mientras que `work_events` registra cambios de estado y deltas de datos en el trabajo.

## 🧬 Dinámica de Conexión (Connections)
-   **Traceability**: Todas las tablas comparten un `trace_id` que permite reconstruir el viaje de una señal desde el `DecisionEvent` hasta el `WorkEvent` final.
-   **Contexto Semántico**: La tabla `fluxcore_semantic_contexts` gestiona las esperas de confirmación (ej: cuando la IA pregunta "¿Confirmas los datos?"), vinculando mensajes específicos con slots pendientes.

## 🛡️ Reglas de Integridad (Operations)
1.  **Unicidad de Slots**: No pueden existir dos slots con el mismo `path` para el mismo `work_id`.
2.  **Inmutabilidad**: Si un slot se marca como `immutable: true`, el motor de WES impedirá cualquier sobrescritura posterior, protegiendo datos críticos (ej: ID de pedido).
3.  **Idempotencia**: La tabla `fluxcore_external_effects` utiliza una `idempotency_key` para asegurar que integraciones externas (herramientas) no se ejecuten dos veces ante reintentos de red.

## 💡 Ejemplo de Uso
```typescript
// Buscar work activo (WorkResolver)
import { db, fluxcoreWorks } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

const [activeWork] = await db.select()
  .from(fluxcoreWorks)
  .where(and(
    eq(fluxcoreWorks.conversationId, conversationId),
    eq(fluxcoreWorks.state, 'in_progress')
  )).limit(1);
```
