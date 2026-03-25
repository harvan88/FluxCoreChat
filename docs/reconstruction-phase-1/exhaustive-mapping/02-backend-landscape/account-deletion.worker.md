---
id: "account-deletion-worker"
type: "worker-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/workers/account-deletion.worker.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle, Cleanup Services, Snapshot validation" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Worker de Fallback (Polling-based)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Job polling, Snapshot verification, Phase execution" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountDeletionWorker (Polling Implementation)

## 🎯 Propósito
Este worker implementa una estrategia de procesamiento de borrado basada en **Polling (muestreo)**. A diferencia de la implementación basada en BullMQ, este worker escanea periódicamente la base de datos cada 5 segundos buscando jobs pendientes para procesar.

## 🔄 Mecanismo de Tick
Funciona mediante un loop infinito controlado por `setInterval`:
1.  **Polling:** Consulta la tabla `account_deletion_jobs` buscando el primer registro en estado `external_cleanup` o `local_cleanup`.
2.  **Snapshot Lock:** Antes de avanzar de fase, verifica si la cuenta requiere un snapshot y si éste ya está generado (`snapshotReadyAt`). Si no lo está, el worker detiene la purga y espera al siguiente tick.
3.  **Ejecución:** Llama a los servicios de limpieza correspondientes.

## 🛡️ Prevención de Colisiones (`ticking`)
Implementa un flag de estado interno (`ticking`) que evita que se solapen dos ejecuciones si un proceso de borrado tarda más que el intervalo de muestreo definido (5s).

## 💡 Dualidad de Ejecución
En el ecosistema FluxCore coexististe este worker de polling junto con el sistema BullMQ. El sistema de polling actúa a menudo como fallback o para entornos donde Redis no está disponible, garantizando que el borrado de datos (una operación crítica de cumplimiento legal) se ejecute siempre por algún mecanismo.

## 💡 Ejemplo de Uso
```typescript
// El worker se ejecuta como proceso de fondo
// Iniciado automáticamente por el sistema de workers
import { account_deletion.worker } from 'apps/api/src/workers/account-deletion.worker.ts';

// Polling loop típico
setInterval(() => worker.poll(), intervalMs);
```
