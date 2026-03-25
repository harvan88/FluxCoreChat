---
id: "core-workresolver"
type: "kernel-logic"
status: "ratified"
criticality: "critical"
location: "apps/api/src/core/WorkResolver.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore Works, Decision Events, Proposed Works" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Lógica de Enrutamiento Canónico (WOS-100)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Active work discovery (Terminal state check), Context resolution (Resume vs Evaluate), Decision record persistence, Proposed work anchoring, Trace correlation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏗️ Work Resolver

## 🎯 Propósito
El `WorkResolver` implementa la lógica canónica de enrutamiento de FluxCore (WOS-100 / WES-130). Su responsabilidad es decidir si un mensaje entrante es la continuación de una tarea en curso (Tarea Activa) o si debe ser tratado como una nueva intención que requiere evaluación de la IA.

## 🚥 Estados Terminales e Invariantes
Define qué constituye una "Tarea Activa": Cualquier registro en la tabla `fluxcore_works` que no esté en un estado terminal (`COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED`).
-   Si existe una tarea activa para la relación y conversación dada, el resolver devuelve un comando `RESUME_WORK`.
-   Si no hay tareas vivas, devuelve `EVALUATE_PROPOSAL`, indicando que la IA debe decidir el siguiente paso.

## 🧬 Registro de Decisiones Cognitivas
Más allá de resolver el estado, este componente es el diario de a bordo de la IA:
-   **Decision Events**: Registra cada evaluación de la IA, capturando el input original, el modelo usado y la propuesta resultante.
-   **Proposed Works**: Si la IA cree que el usuario intenta realizar una acción compleja, ancla una "Propuesta de Tarea" en estado `pending`, lista para ser confirmada o rechazada por el usuario o el sistema.

## 🛡️ Trazabilidad Convergente
Mantiene la coincidencia del `traceId` en todas las tablas (`events`, `proposals`, `works`). Esto permite que, meses después, un auditor pueda reconstruir exactamente por qué se inició una tarea, viendo la señal de entrada y la decisión algorítmica documentada por el `WorkResolver`.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: core-workresolver
import { coreWorkresolver } from 'apps/api/src/core/WorkResolver.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await coreWorkresolver.process(input);
```
