---
id: "telemetry-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/core/telemetry/telemetry.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "CoreEventBus, Pipeline (Kernel to Delivery)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Hub de Telemetría Cognitiva" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Step tracking (ingreso to entrega), Async event emission, TriggerSignalId correlation, Error detail capturing, Latency measurement" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ TelemetryService

## 🎯 Propósito
El `TelemetryService` es el sistema de observabilidad de FluxCore. Su función es registrar cada "salto" que da una señal desde que ingresa al Kernel hasta que se entrega como respuesta, permitiendo reconstruir la trazabilidad completa (tracing) de una interacción de IA para auditoría, depuración y facturación.

## 🚥 Nodos del Pipeline
El servicio rastrea los estados definidos por `PipelineNodeStep`:
-   **Ingreso**: Llegada de la señal al sistema.
-   **Proyección**: Procesamiento por los proyectores (Journal).
-   **Worker/Dispatcher**: Gestión de colas y turnos.
-   **Runtime**: Ejecución de la lógica del agente.
-   **Certificación**: Verificación de realidad por el Kernel.
-   **Entrega**: Envío final al canal del usuario (WhatsApp, Web, etc).

## 🧬 Eventos de Telemetría
Cada evento (`PipelineTelemetryEvent`) captura:
-   **IDs de Correlación**: `messageId`, `conversationId`, y los críticos `triggerSignalId` para seguir el rastro a través de la arquitectura log-driven.
-   **Estado**: `pending`, `processing`, `success`, `error`.
-   **Metadatos**: Latencia en ms, modelo de IA usado, y detalles técnicos del error si ocurre.

## 🛡️ Resiliencia Silenciosa
El método `emitTelemetry` está diseñado para ser "Fire and Forget". Utiliza un bloque try-catch interno que asegura que un error en el registro de telemetría (ej: evento mal formado) **nunca detenga la ejecución del pipeline principal**. La emisión se realiza a través del `coreEventBus`, desacoplando totalmente la ejecución de la señal de su monitoreo.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { telemetryService } from 'apps/api/src/core/telemetry/telemetry.service.ts';

// Ejemplo de invocación típica
const result = await telemetryService.execute(params);
```
