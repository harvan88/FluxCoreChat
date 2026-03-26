---
id: "action-executor.service"
type: "core"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/action-executor.service.ts"
---

# 🤖 action-executor.service

## 🎯 Propósito (Canon §4.4)
El `ActionExecutor` es el puente soberano entre el "Cerebro" (FluxCore) y el "Cuerpo" (ChatCore/WES). Su función es recibir una lista de intenciones de ejecución (`ExecutionAction[]`) y transformarlas en efectos secundarios reales y persistidos en el sistema, garantizando la mediación de la plataforma.

## 🏗️ Arquitectura
Implementa el patrón de **Mediated Effect Execution**. Ningún runtime escribe directamente en la base de datos de mensajes o activa procesos de negocio. En su lugar:
1. Recibe acciones propuestas.
2. Valida la autorización de cada acción contra el `PolicyContext`.
3. Ejecuta la acción llamando a servicios especializados (`messageCore`, `templateService`, `workEngineService`).
4. Audita cada paso en `fluxcoreActionAudit`.
5. Cierra formalmente el turno en la cola de cognición (`closeTurn`).

## 🧱 Acciones Soportadas
- **send_message:** Certifica la respuesta de la IA como una señal del Kernel para que ChatCore la entregue.
- **send_template:** Ejecuta el envío de plantillas autorizadas.
- **start_typing:** Emite indicadores de escritura vía WebSocket.
- **Fluxi/WES Actions:** Gestiona el ciclo de vida de procesos de trabajo (`propose_work`, `open_work`, `advance_work_state`, etc.).

## 🧱 Dependencias
- **Depende de:** `cognition-gateway.service.ts`, `template.service.ts`, `work-engine.service.ts`, `core/events.ts`.
- **Es usado por:** `cognitive-dispatcher.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { actionExecutor } from './services/fluxcore/action-executor.service';

const results = await actionExecutor.execute(actions, {
  turnId,
  conversationId,
  accountId,
  runtimeId: 'local',
  policyContext,
  runtimeConfig
});
```
