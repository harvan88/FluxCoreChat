---
id: "chatcore-webchat-gateway-service"
type: "gateway-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/chatcore-webchat-gateway.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Kernel (Signal Ingestion), Visitor Token Registry" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gateway de Ingesta para Visitantes Anónimos (Webchat)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Provisional identity certification (B1), Identity link certification (B2), HMAC Signatures" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ChatCoreWebchatGatewayService

## 🎯 Propósito
Este gateway especializado gestiona la ingesta de señales provenientes del Widget de chat embebible. Su particularidad es que maneja identidades provisionales (Visitantes) que aún no están autenticadas como usuarios del sistema.

## 🚥 Flujos de Certificación
1.  **B1 - Mensaje de Visitante (`certifyIngress`)**:
    -   Utiliza el `visitorToken` como clave de identidad provisional (`@chatcore/webchat-visitor`).
    -   Certifica el mensaje como una observación de entrada externa.
2.  **B2 - Vinculación de Identidad (`certifyConnectionEvent`)**:
    -   Certifica el momento exacto en que un visitante anónimo se autentica (p. ej., deja sus datos en un formulario).
    -   Emite la señal `CONNECTION_EVENT_OBSERVED`, que permite al `IdentityProjector` realizar la fusión de identidades en el sistema persistente.

## 🛡️ Seguridad y Procedencia
-   Utiliza un secreto de firma diferenciado (`WEBCHAT_SIGNING_SECRET`).
-   Marca el `entryPoint` como `widget/message` para que los proyectores sepan aplicar reglas de privacidad específicas para visitantes.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { chatcoreWebchatGatewayService } from 'apps/api/src/services/fluxcore/chatcore-webchat-gateway.service.ts';

// Ejemplo de invocación típica
const result = await chatcoreWebchatGatewayService.execute(params);
```
