---
id: "smart-delay-service"
type: "legacy-service"
status: "deprecated"
criticality: "low"
location: "apps/api/src/services/smart-delay.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto - MARCADO H7" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WebSocket Handler (Legacy), NodeJS Timers" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor Legacy de Debounce de Chat" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "15s response delay, Reset on activity, Typing status toggle, Max retry (5 attempts)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚠️ SmartDelayService (DEPRECATED - H7)

> [!WARNING]
> Este servicio está programado para eliminación. Ha sido reemplazado por el mecanismo de **Turn-Window (3s)** integrado en el `ChatProjector` y `CognitionWorker` de la arquitectura v8.2+.

## 🎯 Propósito Original
Implementaba un mecanismo de "Debounce Inteligente" para las respuestas del asistente, evitando que la IA respondiera a cada mensaje individual mientras el usuario seguía escribiendo en una ráfaga.

## 🚥 Mecanica Legacy
-   **Delayed Response (15s)**: Al recibir un mensaje, iniciaba una cuenta regresiva. Si llegaba otro mensaje del mismo usuario antes del fin del timer, este se reiniciaba.
-   **Typing State Activity**: Durante los últimos 5 segundos del timer, enviaba un evento de "Escribiendo..." vía WebSocket para simular una respuesta humana.
-   **MAX_ATTEMPTS (5)**: Tras 5 reinicios consecutivos, el sistema forzaba el envío a la IA para evitar esperas infinitas.

## 🛑 Estado Actual y Dependencias
-   **Uso Actual**: Únicamente referenciado por `ws-handler.ts` en la ruta de ejecución legacy.
-   **Riesgo de Eliminación**: No debe borrarse hasta que el `ws-handler.ts` sea migrado completamente para emitir Hechos al Kernel en lugar de llamadas directas.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { smartDelayService } from 'apps/api/src/services/smart-delay.service.ts';

// Ejemplo de invocación típica
const result = await smartDelayService.execute(params);
```
