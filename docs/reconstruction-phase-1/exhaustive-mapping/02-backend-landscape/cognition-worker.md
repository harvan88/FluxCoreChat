---
id: "cognition-worker"
type: "worker-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/workers/cognition-worker.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore Cognition Queue, CognitiveDispatcher, CoreEventBus" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Reloj de Ventana de Turno (SmartDelay)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Turn window polling (Expired only), FOR UPDATE SKIP LOCKED (Safe concurrency), Cognitive aggregation delay (3s), Exponential backoff on failure, Telemetry reporting" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 Cognition Worker

## 🎯 Propósito
El `CognitionWorker` es el latido intelectual de FluxCore. Su función es monitorizar la cola de cognición (`fluxcore_cognition_queue`) y decidir cuándo un "pensamiento humano" está completo y listo para ser procesado por la IA. Implementa la lógica de **SmartDelay (Canon §4.5)**.

## 🚥 Ventana de Turno (Turn Window)
Para evitar que la IA responda a cada palabra o ráfaga de mensajes cortos, el worker utiliza una ventana de 3000ms:
1.  Cada nuevo mensaje o señal de escritura reinicia el temporizador de expiración en la cola.
2.  El worker solo selecciona turnos donde `turn_window_expires_at < NOW()`.
3.  **Resultado**: La IA espera a que el humano termine de escribir su idea completa antes de intervenir, ahorrando tokens y mejorando la coherencia.

## 🧬 Concurrencia y Resiliencia
-   **FOR UPDATE SKIP LOCKED**: Permite que múltiples instancias del worker procesen la cola simultáneamente sin chocar entre sí.
-   **Safe-guard Poll**: Además de reaccionar a eventos de "Wake up", realiza un barrido cada 30 segundos para asegurar que ningún turno se quede huérfano por fallos de red o memoria.
-   **Backoff Exponencial**: Si un turno falla repetidamente, el worker incrementa el tiempo de espera para el siguiente reintento, protegiendo a los proveedores de LLM de bucles infinitos de error.

## 🛡️ Delegación Cognitiva
Una vez que un turno expira, el worker delega la ejecución al `CognitiveDispatcher`. Su responsabilidad termina al asegurar que la petición ha sido entregada al motor de inferencia, aunque monitoriza el resultado para gestionar reintentos o marcar el turno como procesado.

## 💡 Ejemplo de Uso
```typescript
// El worker se ejecuta como proceso de fondo
// Iniciado automáticamente por el sistema de workers
import { cognition_worker } from 'apps/api/src/workers/cognition-worker.ts';

// Polling loop típico
setInterval(() => worker.poll(), intervalMs);
```
