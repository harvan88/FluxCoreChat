---
id: "kernel-dispatcher"
type: "kernel-infrastructure"
status: "stable"
criticality: "critical"
location: "apps/api/src/core/kernel-dispatcher.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Transactional Outbox (DB), CoreEventBus, ProjectorRunner" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Wake-up y Heartbeat del Kernel" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Outbox polling (1s), Batch status updates (Pending -> Sent), Wake-up interrupt emission, At-least-once delivery guarantee" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏗️ Kernel Dispatcher

## 🎯 Propósito
El `KernelDispatcher` es el latido del corazón del sistema (heartbeat). Su única misión es monitorizar el **Transactional Outbox** y lanzar una notificación global cada vez que hay nuevos hechos certificados. Es el mecanismo de "Wake-up" de baja latencia que desacopla la escritura en el Kernel del procesamiento en los proyectores.

## 🚥 Latido vs Datos
El dispatcher sigue una filosofía de diseño minimalista: **No transporta datos**. Solo emite una señal de interrupción (`kernel:wakeup`). Esto asegura que el sistema sea extremadamente escalable, ya que los proyectores no dependen de lo que el dispatcher les envíe, sino que ellos mismos consultan el Log de Señales bajo demanda.

## 🧬 Garantía de Entrega (At-least-once)
Utiliza la tabla `fluxcore_outbox` como buffer de seguridad:
1.  Busca registros `pending`.
2.  Los marca como `sent` atómicamente.
3.  Lanza el evento de despertar.
Si el sistema cae entre el paso 2 y 3, el siguiente poll encontrará nuevos registros (o los mismos si falló la marca) y volverá a intentar el despertar, garantizando que ninguna señal se quede sin proyectar.

## 🛡️ Control de Concurrencia
Implementa un guard de `isRunning` y un bucle de polling de 1 segundo (configurable). Consume señales en lotes de 50 para evitar sobrecargar el bus de eventos si ocurre una ráfaga masiva de actividad externa.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: kernel-dispatcher
import { kernelDispatcher } from 'apps/api/src/core/kernel-dispatcher.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await kernelDispatcher.process(input);
```
