---
id: "chat-projector"
type: "kernel-projection"
status: "stable"
criticality: "critical"
location: "apps/api/src/core/projections/chat-projector.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Kernel (Journal), MessageCore, CognitionQueue, CoreEventBus" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Puente Bidireccional de Mensajería" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Inbound: User input to CognitionQueue, Outbound: AI response delivery via MessageCore, Audio transcription synchronization, State mutation projection, Telemetry step emitting" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏗️ Chat Projector

## 🎯 Propósito
El `ChatProjector` actúa como el gran diplomático entre dos mundos soberanos: **ChatCore** (dueño de la comunicación humana) y **FluxCore** (dueño del razonamiento de IA). Su labor es observar el Log de Señales y decidir qué entradas humanas deben ser procesadas por la IA y qué respuestas de la IA deben ser entregadas al mundo humano.

## 🚥 Flujo Inbound (Entrada)
Cuando el Kernel certifica un `EXTERNAL_INPUT_OBSERVED`:
1.  **Ventana de Turno (Turn Window)**: Agrupa mensajes que llegan en ráfagas (3000ms) para evitar disparar la IA por cada fragmento.
2.  **Sincronización de Audio**: Si el mensaje contiene audio, el proyector detecta que la transcripción está pendiente y **congela** el encolado hacia la IA hasta que llega el evento de transcripción completada.
3.  **Encolado de Cognición**: Una vez validado, inserta la petición en `fluxcore_cognition_queue` y despierta al `CognitionWorker`.

## 🧬 Flujo Outbound (Salida)
Cuando el Kernel certifica un `AI_RESPONSE_GENERATED`:
1.  **Resolución de Actor**: Identifica la personalidad (actorId) que está respondiendo.
2.  **Entrega vía MessageCore**: Utiliza `setImmediate` para invocar la entrega física del mensaje (WebSocket/DB) *después* de que la transacción del Kernel haya confirmado, asegurando que la respuesta solo se envíe si el hecho ya es parte de la "realidad oficial".

## 🛡️ Proyección de Mutaciones
No solo maneja mensajes, sino cambios estructurales:
-   **Overwrite/Edit**: Observa señales de edición de mensajes para actualizar cachés o metadatos derivados.
-   **Conversation Destroyed**: Proyecta la destrucción de hilos para limpieza de recursos.
-   **Trazabilidad (TriggerSignalId)**: Mantiene el hilo de Ariadna entre la entrada que causó la respuesta y la respuesta misma, alimentando el sistema de telemetría.

## 💡 Ejemplo de Uso
```typescript
// El projector consume señales del Kernel Journal
import { projector } from 'apps/api/src/core/projections/chat-projector.ts';

// Se ejecuta automáticamente por el ProjectorRunner
await projector.processSignal(signal);
```
