---
id: "runtime-gateway-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/runtime-gateway.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "RuntimeConfigService, FluxCoreRuntimeAdapter, EchoRuntime, Drizzle (indirectly via config)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gateway de Ejecución de Agentes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Message routing to specific runtimes, Runtime registration registry, Sovereignty enforcement (no fallback policy), Action aggregation (send_message, propose_work, etc.)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RuntimeGatewayService

## 🎯 Propósito
El `RuntimeGatewayService` actúa como el router inteligente de la capa cognitiva de FluxCore. Su misión es recibir un mensaje y decidir qué "cerebro" (Runtime) debe procesarlo, traduciendo las respuestas de estos cerebros en acciones concretas dentro de la conversación.

## 🚥 Soberanía de Runtimes
El gateway aplica un principio de **Soberanía Estricta**:
-   Cada cuenta tiene asignado un `activeRuntimeId` (ej: `@fluxcore/asistentes`).
-   Si el runtime configurado no está disponible, el gateway lanza una excepción crítica en lugar de hacer un "silent fallback" a otro runtime. Esto garantiza que el comportamiento de la IA sea predecible y cumpla con las políticas del negocio.

## 🧬 Adaptadores y Acciones
El servicio estandariza la salida de los diferentes runtimes en una lista de `ExecutionAction`s:
-   `send_message`: Enviar una respuesta de texto o media.
-   `send_template`: Disparar el envío de una plantilla predefinida.
-   `propose_work`: Iniciar un flujo de trabajo WES (propuesta de tarea).
-   `broadcast_event`: Emitir eventos técnicos a la UI o sistemas externos.

## 🛡️ Echo Runtime
Incluye un runtime de depuración de bajo nivel (`EchoRuntime`) capaz de detectar intenciones de saludo humano y responder automáticamente con plantillas de bienvenida si están disponibles, sirviendo como base para pruebas de conectividad de canal.
 village.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { runtimeGatewayService } from 'apps/api/src/services/runtime-gateway.service.ts';

// Ejemplo de invocación típica
const result = await runtimeGatewayService.execute(params);
```
