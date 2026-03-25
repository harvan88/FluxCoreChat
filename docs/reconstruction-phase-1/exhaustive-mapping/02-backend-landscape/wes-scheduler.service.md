---
id: "wes-scheduler-service"
type: "orchestration-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/wes-scheduler.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WorkEngineService, Croner" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mantenimiento del Ciclo de Vida Artificial" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Periodic maintenance (1m), Work expiration, Semantic context cleanup, Garbage collection of stale states" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ WESSchedulerService

## 🎯 Propósito
Este servicio actúa como el "metabolismo" del sistema de ejecución de tareas (WES). Su función única es ejecutar tareas de limpieza y mantenimiento en segundo plano para asegurar que el sistema no retenga estados obsoletos o expirados.

## 🚥 Mantenimiento Minutal
Utiliza un cron (`* * * * *`) que se dispara cada minuto para invocar el método `expireMaintenance` del `WorkEngineService`.

## 🧬 Funciones de Limpieza
1.  **Expiración de Works**: Pasa a estado `EXPIRED` cualquier trabajo activo que haya superado su `expires_at` legal.
2.  **Caducidad de Contextos**: Marca como `expired` cualquier solicitud de confirmación semántica pendiente que el usuario no haya respondido a tiempo, liberando la conversación de "bloqueos" de espera.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { wesSchedulerService } from 'apps/api/src/services/wes-scheduler.service.ts';

// Ejemplo de invocación típica
const result = await wesSchedulerService.execute(params);
```
