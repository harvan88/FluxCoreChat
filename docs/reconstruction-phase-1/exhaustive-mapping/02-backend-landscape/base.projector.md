---
id: "base-projector"
type: "kernel-core"
status: "ratified"
criticality: "critical"
location: "apps/api/src/core/kernel/base.projector.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore Signals (Journal), ProjectorCursors, ProjectorErrors" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Fundación de Proyección Log-Driven" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Atomic Cursor advancement, Error record & loop stop (Blocked-but-consistent), Idempotent re-run, Batch processing (100 signals), Cold-start replay" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏗️ Base Projector

## 🎯 Propósito
El `BaseProjector` es el contrato de cierre (closure contract) que define cómo se construye la realidad en FluxCore. Su función es garantizar que el sistema se base en el **Log de Señales** (Journal) y no en eventos volátiles, permitiendo que cualquier componente pueda reconstruir su estado actual simplemente "re-proyectando" las señales históricas.

## 🚥 Invariantes del Canon
El sistema impone reglas estrictas para mantener la consistencia soberana:
1.  **Cursor Atómico**: El puntero de avance (`cursor`) solo se actualiza dentro de la misma transacción de base de datos que la escritura de la proyección. Si uno falla, ambos fallan.
2.  **Fallo Bloqueante**: Si un mensaje falla, el bucle se detiene. El sistema prefiere "congelar" una proyección antes de permitir que sea inconsistente. Los errores se registran en `fluxcore_projector_errors` para supervisión.
3.  **Wake-Up No-Bloqueante**: Utiliza `setImmediate` para manejar lotes grandes, evitando bloquear el hilo principal de ejecución mientras procesa miles de señales.

## 🧬 Metodología log-driven
A diferencia de una arquitectura puramente orientada a eventos, los proyectores no "escuchan" eventos; ellos "tiran" del log. Esto permite:
-   **Replay Completo**: Resetear el cursor a 0 para regenerar toda la base de datos de negocio si el esquema cambia.
-   **Trazabilidad Total**: Cualquier dato en el sistema puede ser rastreado hasta la señal original que lo causó.

## 🛡️ Idempotencia Obligatoria
Todas las implementaciones de `project()` deben ser idempotentes. Debido a que el sistema puede reintentar una señal tras un fallo parcial o durante un replay, la lógica de negocio debe ser capaz de procesar la misma señal múltiples veces sin corromper el estado.

## 💡 Ejemplo de Uso
```typescript
// El projector consume señales del Kernel Journal
import { projector } from 'apps/api/src/core/kernel/base.projector.ts';

// Se ejecuta automáticamente por el ProjectorRunner
await projector.processSignal(signal);
```
