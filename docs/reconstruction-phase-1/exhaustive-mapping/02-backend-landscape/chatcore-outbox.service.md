---
id: "chatcore-outbox-service"
type: "infrastructure-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/chatcore-outbox.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ChatCoreGateway, Kernel (via Gateway), Drizzle (chatcoreOutbox, messages)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Certificación Asíncrona (Ingreso)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Transaction-safe queuing, SKIP LOCKED worker processing, Kernel ingress certification, Loop prevention (__processed__ flag), Multi-tier retry logic, Signal-to-Message linking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ChatCoreOutboxService

## 🎯 Propósito
El `ChatCoreOutboxService` garantiza que ningún mensaje entrante (Ingress) se pierda antes de ser certificado por el Kernel. Implementa el patrón "Transactional Outbox" para separar la persistencia inicial del mensaje en ChatCore de su certificación de realidad, aumentando la resiliencia del sistema ante fallos externos.

## 🚥 Procesamiento Seguro (FOR UPDATE SKIP LOCKED)
El worker utiliza una consulta SQL avanzada con `SKIP LOCKED`. Esto permite escalar el procesamiento en múltiples instancias concurrentes sin que dos workers traten de certificar el mismo mensaje, garantizando que cada registro sea procesado exactamente una vez de forma eficiente.

## 🧬 Certificación de Ingreso
Para cada registro en el outbox, el servicio:
1.  **Llama al ChatCoreGateway**: Intenta convencer al Kernel de que un mensaje del mundo real ha entrado al sistema.
2.  **Vincula la Realidad**: Si el Kernel acepta el ingreso, el servicio actualiza el registro del mensaje original vinculándolo al `signalId` generado, cerrando el bucle de trazabilidad.

## 🛡️ Resiliencia y Prevención de Bucles
-   **Retry Logic**: Soporta hasta 10 reintentos con guardado del `last_error` para diagnósticos técnicos.
-   **Loop Prevention**: Utiliza un flag interno (`__processed__`) dentro del JSON del payload para evitar que el worker entre en un bucle infinito si el gateway devolviera una respuesta ambigua, priorizando la estabilidad del sistema sobre la duplicidad de certificados.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { chatcoreOutboxService } from 'apps/api/src/services/chatcore-outbox.service.ts';

// Ejemplo de invocación típica
const result = await chatcoreOutboxService.execute(params);
```
