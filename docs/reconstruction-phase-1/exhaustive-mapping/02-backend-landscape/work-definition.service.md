---
id: "work-definition-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/work-definition.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WorkEngineService (consumer), Drizzle (fluxcoreWorkDefinitions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Repositorio de Blueprints de Tareas (WES)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WorkDefinition CRUD, Semantic versioning sort, Slot structure validation, FSM transition mapping, Per-account listing of latest versions" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ WorkDefinitionService

## 🎯 Propósito
El `WorkDefinitionService` gestiona las "recetas" o planos de los hilos de trabajo en FluxCore. Define qué datos son necesarios, cómo fluye el proceso y qué reglas de negocio se aplican a cada tipo de tarea gestionada por el Work Engine (WES).

## 🚥 Anatomía de una Definición
Cada definición contiene:
-   **Slots**: Campos de datos con tipos específicos, marcas de obligatoriedad y de inmutabilidad (una vez seteados, no se cambian).
-   **FSM (Finite State Machine)**: El mapa de estados permitidos y las transiciones válidas entre ellos.
-   **Policies**: Reglas de expiración de la tarea y permisos de negociación entre las partes.

## 🧬 Versionado Semántico
El servicio permite registrar múltiples versiones de una misma definición de trabajo. Implementa la lógica `getLatest`, que resuelve automáticamente la versión más reciente disponible para una cuenta, facilitando la evolución de los procesos de negocio sin romper las tareas activas basadas en versiones antiguas.

## 🛡️ Resolución e Integridad
Al listar las definiciones (`listLatest`), el servicio asegura un aislamiento estricto por `accountId`. Esto garantiza que los agentes e interfaces de una empresa solo puedan proponer flujos de trabajo que han sido configurados y autorizados específicamente para esa organización en el catálogo de definiciones.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { workDefinitionService } from 'apps/api/src/services/work-definition.service.ts';

// Ejemplo de invocación típica
const result = await workDefinitionService.execute(params);
```
