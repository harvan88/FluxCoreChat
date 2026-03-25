---
id: "cognition-gateway-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/cognition-gateway.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Kernel (ingestion), CoreEventBus (telemetry), Drizzle (none - sovereign)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Reality Adapter de Certificación Cognitiva" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AI response certification (signal signing), Evidence structural assembly, Traceability ID propagation, HMAC-SHA256 reality signing, Telemetry pipeline emission" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ CognitionGatewayService

## 🎯 Propósito
El `CognitionGatewayService` es el puente de "Soberanía de Realidad" entre FluxCore (el cerebro) y el Kernel (el certificador). Su misión es transformar una respuesta generada por IA en un "Hecho Certificado" dentro del log inmutable del sistema, asegurando que cada palabra del asistente tenga una procedencia verificable.

## 🚥 Certificación de Realidad
Cuando la IA genera un mensaje, este servicio:
1.  **Construye la Evidencia**: Envasa el texto, el modelo utilizado, el proveedor y el contexto de seguridad original.
2.  **Firma la Verdad**: Utiliza un secreto (`FLUXCORE_SIGNING_SECRET`) para generar un HMAC-SHA256 del contenido, garantizando que el mensaje no sea alterado por otros servicios.
3.  **Ingesta en el Kernel**: Registra el hecho como la señal `AI_RESPONSE_GENERATED`.

## 🧬 Trazabilidad Unificada (COR-001)
Implementa la propagación del `triggerSignalId`. Esto permite conectar el mensaje original del usuario con la respuesta de la IA en un único hilo de telemetría, permitiendo auditorías de "fin a fin" sobre por qué la IA respondió lo que respondió.

## 🛡️ Aislamiento del Mundo Exterior
Siguiendo las reglas de arquitectura de FluxCore, este servicio **no escribe en la base de datos de chats** ni emite WebSockets directamente. Su única responsabilidad es convencer al Kernel de que algo ocurrió. El resto del sistema (como el `BaseProjector`) reaccionará a esta certificación para entregar el mensaje.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { cognitionGatewayService } from 'apps/api/src/services/fluxcore/cognition-gateway.service.ts';

// Ejemplo de invocación típica
const result = await cognitionGatewayService.execute(params);
```
