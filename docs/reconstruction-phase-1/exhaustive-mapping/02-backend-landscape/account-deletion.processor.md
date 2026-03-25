---
id: "account-deletion-processor"
type: "worker-logic"
status: "stable"
criticality: "high"
location: "apps/api/src/workers/account-deletion.processor.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cleanup Services (Local/External), Guard Service, Metrics, System Events" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cerebro de Ejecución de Purgas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Phase transitions, Metadata enrichment, Failure logging, System broadcasting" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountDeletionProcessor

## 🎯 Propósito
Este componente contiene la lógica central de ejecución para el borrado de cuentas. Es agnóstico a la infraestructura de colas (puede ser llamado por BullMQ o por un simple bucle `setInterval`) y se encarga de orquestar el movimiento entre las fases de limpieza.

## 🔄 Orquestación de Fases
El procesador maneja la transición determinista entre estados:
1.  **`external_cleanup`**: Invoca al servicio externo para borrar datos en OpenAI y generar el snapshot si es necesario. Al terminar, promueve el job a la siguiente fase.
2.  **`local_cleanup`**: Invoca el purgado masivo de la base de datos local (Chat Core, IA, Finanzas).
3.  **`completed` / `failed`**: Marca el Job como finalizado y emite eventos de sistema.

## 🛡️ Double-Check de Seguridad
Incluso dentro del flujo de worker asíncrono, el procesador llama al `accountDeletionGuard` antes de cada fase para asegurar que no se esté intentando borrar una cuenta protegida que haya cambiado su estatus de protección tras ingresar a la cola.

## 📊 Telemetría y Eventos
- **Métricas:** Registra el tiempo de ejecución de cada fase y el número de jobs fallidos/exitosos en el `metricsService`.
- **WebSocket:** Emite eventos `account:deleted` o `account:deletion_failed` a través de `broadcastSystemEvent` para actualizar las interfaces administrativas en tiempo real.
- **Audit Logs:** Genera registros inmutables en la tabla `account_deletion_logs` detallando el éxito o fracaso de cada paso.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: account-deletion.processor
import { accountDeletion.processor } from 'apps/api/src/workers/account-deletion.processor.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await accountDeletion.processor.process(input);
```
