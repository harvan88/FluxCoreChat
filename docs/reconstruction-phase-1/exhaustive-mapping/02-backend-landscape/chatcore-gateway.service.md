---
id: "chatcore-gateway-service"
type: "gateway-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/chatcore-gateway.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Kernel (Signal Ingestion), Deterministic Identifiers, HMAC Signing" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Frontera Causal de Ingesta Humana" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ingress certification, Physical identity mapping, Deterministic ID (HMAC), Signal signing, State change certification (editions/deletions)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ChatCoreGatewayService

## 🎯 Propósito
Este servicio actúa como el guardián de la "Realidad" para los mensajes que entran desde la API o interfaces autenticadas. Su función es observar una intención de comunicación humana y **certificarla** ante el Kernel, convirtiendo un payload de red en un hecho inmutable (Señal).

## 🛡️ Certificación de Ingesta (`certifyIngress`)
1.  **Construcción de Evidencia**: Captura metadata del entorno (IP, User Agent, Timestamp) y el contenido crudo.
2.  **Determinismo de ID**: Genera un ID externo usando un hash HMAC (Contenido + Usuario + Tiempo) para garantizar la idempotencia y evitar señales duplicadas en ráfagas rápidas.
3.  **Firma Hash**: Calcula una firma criptográfica del candidato a señal usando un secreto compartido, asegurando que el Kernel confíe en que la observación proviene de una fuente autorizada.
4.  **Ingestión**: Envía la señal `EXTERNAL_INPUT_OBSERVED` al Kernel.

## 🔄 Certificación de Mutaciones (`certifyStateChange`)
No solo certifica mensajes nuevos, sino también cambios estructurales en la base de datos de "Realidad":
-   **Eventos**: `message_content_overwritten`, `message_content_edited`, `conversation_destroyed`.
-   **Trazabilidad**: Registra quién realizó la mutación y los hashes de contenido (antiguo vs nuevo) para permitir auditorías de integridad de la conversación.

## 🚥 Independencia de Dominio
Siguiendo los principios del Canon de FluxCore:
-   **Agnóstico de DB**: No realiza lecturas ni escrituras en la tabla de `messages`.
-   **Sin Lógica de Negocio**: No decide si un mensaje es "bueno" o "malo", solo certifica que "ocurrió".

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { chatcoreGatewayService } from 'apps/api/src/services/fluxcore/chatcore-gateway.service.ts';

// Ejemplo de invocación típica
const result = await chatcoreGatewayService.execute(params);
```
