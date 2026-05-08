---
id: "distributed-event-bus"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/core/events.ts"
---

# 🤖 Distributed Event Bus (Redis Bridge)

## 🎯 Propósito
Proporciona un mecanismo de comunicación asíncrona y distribuida entre los diferentes procesos del sistema (API, Kernel, Workers). Permite que eventos emitidos en un proceso sean capturados y re-emitidos en todos los demás nodos conectados a la misma instancia de Redis.

## ⚙️ Arquitectura
El bus extiende `EventEmitter` de Node.js e implementa un patrón **Bridge** con Redis Pub/Sub:

1.  **Emisión Local**: Cuando se llama a `emit()`, el evento se dispara primero en el proceso local.
2.  **Publicación en Redis**: El evento se serializa y se publica en un canal global de Redis (`fluxcore:events`).
3.  **Suscripción Distribuida**: Todos los procesos escuchan el canal de Redis.
4.  **Re-emisión Controlada**: Al recibir un mensaje de Redis, el bus lo re-emite localmente si el `PROCESS_ID` de origen es diferente al local, evitando bucles infinitos.

## 🚀 Eventos Críticos
*   `core:message_received`: Sincronización de mensajes entre Kernel (IA) y API (WebSocket).
*   `core:message_updated`: Notificación de ediciones o enriquecimiento de mensajes.
*   `core:activity`: Estado de escritura/presencia distribuido.
*   `telemetry:pipeline_step`: Visualización de pasos cognitivos en la Kernel Console.
*   `fluxcore.work_proposed`: Notificación de propuestas de trabajo del WES.

## 🛠️ Mantenimiento y Ciclo de Vida
El bus soporta un **Graceful Shutdown** mediante el método `shutdown()`, que asegura el cierre limpio de las conexiones de Redis (`quit()`), evitando fugas de descriptores en el servidor.

## 💡 Ejemplo de Uso
```typescript
import { coreEventBus } from './core/events';

// En Proceso A (Kernel)
coreEventBus.emit('core:message_received', { envelope, result });

// En Proceso B (API)
coreEventBus.on('core:message_received', (payload) => {
  // Recibido automáticamente via Redis
});
```

## 🛡️ Resiliencia (Modo Degradado)
Si Redis no está disponible o la conexión falla, el bus opera en **Modo Local**. Los eventos seguirán funcionando dentro del mismo proceso, pero la comunicación entre procesos se perderá hasta que la conexión se restablezca automáticamente.
