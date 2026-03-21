# Cognition Gateway – El Certificador de Realidad

**Ubicación:** `apps/api/src/services/fluxcore/cognition-gateway.service.ts`  
**Responsabilidad:** "Reality Adapter". Es el único punto de contacto donde el "Cerebro" (FluxCore) interactúa con la "Realidad" (El Kernel).

---

## 🧩 1. Propósito y Canon

Según el diseño arquitectónico:
- **FluxCore NO escribe directamente** en la base de datos de mensajes (`ChatCore`).
- **FluxCore NO hace broadcast** por WebSocket a los clientes.
- FluxCore **solo piensa y propone**. 

Para que un pensamiento se vuelva real, debe pasar por el `CognitionGateway`. Éste encapsula el pensamiento en una señal oficial y se la entrega al **Kernel** para que la certifique y la convierta en realidad.

---

## 🔄 2. Flujo de Certificación

El método principal es `certifyAiResponse(params)`:

1. **Recepción del Output:** Recibe el contenido generado por el LLM, el ID de la conversación, la cuenta que responde y metadata técnica (modelo, proveedor, runtime).
2. **Construcción de Evidencia:** Empaqueta todos estos datos en un objeto estructurado (`evidenceRaw`).
3. **Firma Criptográfica (Integridad):** 
   - Genera una firma (HMAC-SHA256) usando el secreto del sistema (`FLUXCORE_SIGNING_SECRET`).
   - Esto previene que alguien suplante a la IA inyectando mensajes falsos directamente en el Kernel.
4. **Ingestión al Kernel:** Llama a `kernel.ingestSignal()` con el tipo `AI_RESPONSE_GENERATED`.

---

## 🧱 3. Estructura de la Señal

Lo que se envía al Kernel se ve así:

```json
{
  "type": "AI_RESPONSE_GENERATED",
  "origin": "fluxcore-cognition-gateway/1.0.0",
  "driverId": "fluxcore/cognition",
  "payload": {
    "conversationId": "uuid...",
    "accountId": "uuid...",
    "content": { "text": "Hola, soy el asistente" }
  },
  "evidence": {
    "raw": { /* metadata técnica */ },
    "signature": "hmac-sha256-hash..."
  }
}
```

---

## 🔗 4. ¿Qué pasa después? (Efecto Secundario)

Una vez que el Kernel ingiere y valida esta señal:
1. La guarda en el registro de la verdad (`kernel_signals`).
2. El **ChatProjector** (que escucha al Kernel) detecta la señal.
3. El proyector convierte esa señal en una entrada en la tabla `messages`.
4. El proyector emite la señal a WebSocket.
*(Ver flujos End-to-End para el ciclo completo).*

---

## 📋 5. Dependencias Clave

- **`kernel.ingestSignal()`:** El motor central del sistema.
- **Node.js `crypto`:** Para la validación y firma HMAC.
