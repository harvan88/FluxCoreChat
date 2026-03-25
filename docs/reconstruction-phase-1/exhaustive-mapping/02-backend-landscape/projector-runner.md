---
id: "projector-runner"
type: "kernel-orchestration"
status: "stable"
criticality: "high"
location: "apps/api/src/core/kernel/projector-runner.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "CoreEventBus, IdentityProjector, ChatProjector, SessionProjector" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador de Ciclo de Vida de Proyecciones" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cold-start recovery, Projector registry management, Event-to-Wakeup mapping, Heartbeat subscription" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏗️ Projector Runner

## 🎯 Propósito
El `ProjectorRunner` es el director de orquesta que asegura que todos los proyectores del sistema estén activos, sincronizados y procesando la realidad. Es el encargado de realizar el "Catch up" inicial cuando el servicio arranca y de reaccionar a los latidos del corazón (heartbeats) del sistema.

## 🚥 Arranque en Frío (Cold Start)
En el momento del inicio del API, el runner ejecuta un ciclo de recuperación inmediato por cada proyector registrado. Esto garantiza que si el sistema estuvo apagado mientras llegaban señales externas, los proyectores procesen todo el historial pendiente desde su último cursor conocido antes de empezar a recibir tráfico nuevo.

## 🧬 Registro de Proyectores
Centraliza la lista de proyectores activos. Actualmente orquesta:
-   **IdentityProjector**: Mapeo de perfiles y actores.
-   **ChatProjector**: Puente entre humanos e IA.
-   **SessionProjector**: Seguimiento de estados de conexión y seguridad.

## 🛡️ Suscripción al Despertador (Wake Up)
Mantiene una suscripción global al `coreEventBus` para el evento `kernel:wakeup`. Cada vez que el `KernelDispatcher` detecta nuevas señales certificadas, el runner recibe la señal y "despierta" a toda la flota de proyectores en paralelo, manteniendo la realidad de negocio actualizada con latencia mínima.

## 💡 Ejemplo de Uso
```typescript
// El projector consume señales del Kernel Journal
import { projector } from 'apps/api/src/core/kernel/projector-runner.ts';

// Se ejecuta automáticamente por el ProjectorRunner
await projector.processSignal(signal);
```
