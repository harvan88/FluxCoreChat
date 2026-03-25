---
id: "account-deletion-queue"
type: "subsystem"
status: "stable"
criticality: "high"
location: "apps/api/src/workers/account-deletion.queue.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "BullMQ, Account Deletion Processor, Metrics Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sistema de Colas de Alta Disponibilidad para Borrado" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Job enqueuing, Concurrency control, Backoff management, Health monitoring" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountDeletionQueue (BullMQ Implementation)

## 🎯 Propósito
Este componente implementa el sistema de colas robusto para la eliminación de cuentas utilizando **BullMQ** sobre Redis. Está diseñado para manejar cargas masivas de datos y asegurar que el borrado se ejecute de forma asíncrona y resiliente, sin comprometer el rendimiento de la API principal.

## 🏗️ Configuración de Resiliencia
- **Backoff Exponencial:** Si un borrado falla (ej: por caída de la API de OpenAI), el job se reintenta automáticamente hasta 5 veces, incrementando el tiempo de espera entre intentos (empezando en 2s).
- **Concurrencia Controlada:** Permite configurar cuántos borrados simultáneos puede procesar el worker (por defecto 2) para no saturar las conexiones a la base de datos o exceder los ratelimits de proveedores externos.

## 📈 Monitoreo de Salud
El componente reporta periódicamente estadísticas de la cola al sistema de métricas:
- Cantidad de jobs en espera (`waiting`), activos (`active`), completados y fallidos.
- Proporción de jobs retrasados (`delayed`).

## 🛠️ Integración con BullMQ
- **Automatic Cleanup:** La cola está configurada para mantener solo los últimos 100 jobs exitosos y 1000 fallidos, evitando el crecimiento desmedido de la base de datos de Redis.
- **Fire-and-Forget:** Las rutas administrativas simplemente llaman a `enqueueAccountDeletionJob(jobId)`, delegando toda la responsabilidad de la ejecución a esta infraestructura de colas.

## 🔗 Dependencias
- **BullMQ**: Motor principal de colas sobre Redis (`Job`, `JobsOptions`, `Worker`).
- **account-deletion.processor**: Contiene la lógica profunda de borrado en BD que el worker ejecuta ciegamente (`getDeletionJobById`, `processDeletionJob`).
- **metricsService**: Telemetría (`gauge`) para instrumentar de forma continua el volumen transaccional de la cola.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: account-deletion.queue
import { accountDeletion.queue } from 'apps/api/src/workers/account-deletion.queue.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await accountDeletion.queue.process(input);
```
