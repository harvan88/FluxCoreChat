# Kernel — visión general estructural v4.0

## Preguntas ontológicas para IA

**Antes de leer este documento, responde estas preguntas para ubicarte en nuestro universo:**

1. **¿Qué significa que el Kernel sea "soberano"? ¿Es soberano sobre qué?**
   - No es sobre autoridad técnica, es sobre poder de existencia
   - El Kernel decide qué existe y qué no existe en el mundo del sistema

2. **¿Si algo no pasa por el Kernel, existe en el sistema? ¿O es como si nunca hubiera pasado?**
   - Si el Kernel no lo certifica, no existe para el sistema
   - El Kernel es la frontera entre la realidad externa y la existencia interna

3. **¿El Kernel "descubre" realidad o "crea" realidad para el sistema?**
   - No descubre, declara
   - No valida que algo sea cierto, determina que algo existe

4. **¿Dónde termina el mundo real y dónde comienza el mundo del sistema? ¿Quién dibuja esa línea?**
   - La línea la dibujan los Reality Adapters
   - Son los únicos ojos y oídos del sistema

5. **¿Si hay un conflicto entre lo que pasó y lo que el Kernel dice que pasó, qué es verdad?**
   - Lo que el Kernel dice que pasó es la única verdad del sistema
   - El Journal no es un registro histórico, es el universo del sistema

6. **¿El Kernel gestiona información o gestiona EXISTENCIA?**
   - No gestiona datos, gestiona realidad
   - No es un log, es la fuente de verdad ontológica

**Advertencia: La palabra "kernel" en otros contextos (Linux, OS) te confundirá. Este Kernel no es un componente técnico, es una frontera filosófica.**

---

## 🚀 **Novedades v4.0 - Kernel como Puente Bidireccional**

### **Cambios Fundamentales:**

1. **🎵 Audio Nativo:** Soporte completo para transcripción de audio a través del Kernel
2. **🤖 AI Bidireccional:** FluxCore certifica respuestas, ChatCore entrega
3. **📊 Debug Masivo:** Logs detallados para diagnóstico de problemas
4. **🔗 Event Bus Rico:** 23 eventos para orquestación compleja
5. **🔍 Trazas Enriquecidas:** Información completa de modelo y PolicyContext en señales

### **Arquitectura Actualizada:**

```
ChatCore (Soberano) ↔ Kernel (Puente) ↔ FluxCore (Consumidor)
     ↑                    ↓                    ↓
Persiste          Certifica         Genera AI
Audio →           Transcripción      → Respuestas
```

---

## Rol del dominio

El Kernel es el certificador soberano de realidad del sistema. Su función es aceptar únicamente señales certificadas por adapters autorizados, validarlas y registrarlas como journal inmutable. El Kernel no interpreta negocio conversacional ni lógica cognitiva. Su trabajo es garantizar que el sistema solo avance a partir de hechos certificados.

**v4.0:** Ahora actúa como **puente bidireccional** entre ChatCore y FluxCore, coordinando flujos multimodales (audio → transcripción → IA).

## Definición canónica validada v4.0

La definición histórica evolucionó: el Kernel sigue siendo una frontera soberana de certificación y journalización, pero ahora también es un **coordinador activo** de flujos entre mundos.

La superficie de señales se expandió para soportar:
- **ChatCore → Kernel:** `EXTERNAL_INPUT_OBSERVED`, `EXTERNAL_STATE_OBSERVED`, `chatcore.message.received`
- **FluxCore → Kernel:** `AI_RESPONSE_GENERATED`, `CONNECTION_EVENT_OBSERVED`
- **Audio:** Transcripción coordinada a través del Kernel

## Responsabilidades principales v4.0

- validar que una señal pertenezca a un tipo físico permitido
- verificar que el adapter que certifica la señal exista y esté autorizado
- verificar firma y consistencia de la señal certificada
- persistir la señal en el journal inmutable
- escribir en el outbox del Kernel para despertar procesamiento posterior
- **🆕 coordinar flujos de transcripción de audio**
- **🆕 facilitar comunicación bidireccional ChatCore ↔ FluxCore**
- servir de fuente de verdad para projectors

## Componentes principales

### 1. Ingesta soberana v4.0

- `apps/api/src/core/kernel.ts`
  - **378 líneas** vs ~299 anteriores
  - `ingestSignal()` es la entrada soberana de hechos al sistema
  - **🆕 Debug extensivo** con logs en cada gate
  - **🆕 Timestamps estandarizados** (ISO strings)
  - **🆕 Outbox transaccional** integrado
  - valida tipo de hecho, adapter, driver y firma HMAC
  - persiste la señal en el journal del Kernel

### 2. Activación de procesamiento v4.0

- `packages/db/src/schema/fluxcore-outbox.ts`
  - outbox del Kernel usado para despertar procesamiento posterior
- `apps/api/src/core/kernel-dispatcher.ts`
  - hace polling de `fluxcore_outbox`
  - no transporta payloads de negocio
  - emite solo la interrupción `kernel:wakeup`
- `apps/api/src/core/events.ts`
  - **🆕 23 eventos** vs ~15 anteriores
  - **🆕 Eventos de transcripción:** `asset:transcription_completed`
  - **🆕 Eventos de mensajes:** `core:message_updated`
  - **🆕 Eventos de kernel:** `kernel:wakeup`, `kernel:cognition:wakeup`

### 3. Proyección del journal v4.0

- `apps/api/src/core/kernel/base.projector.ts`
  - contrato base de todos los projectors
  - asegura cursor atómico, replay, registro de errores y retry desde cursor
- `apps/api/src/core/kernel/projector-runner.ts`
  - arranca los projectors actuales y los despierta en cada `kernel:wakeup`
  - **🆕 Inicio en paralelo** (no secuencial)
  - hoy registra:
    - `identityProjector`
    - `chatProjector` (**🆕 Bidireccional v4.0**)
    - `sessionProjector`
- `packages/db/src/schema/fluxcore-projector-cursors.ts`
  - cursor persistente por projector
- `packages/db/src/schema/fluxcore-signals.ts`
  - journal inmutable consultado por projectors

### 4. 🆕 ChatProjector v4.0 - Puente Bidireccional

- `apps/api/src/core/projections/chat-projector.ts`
  - **435 líneas** reestructuradas
  - **INBOUND:** `EXTERNAL_INPUT_OBSERVED` → `cognition_queue`
  - **OUTBOUND:** `AI_RESPONSE_GENERATED` → `messageCore.receive`
  - **🎵 Audio:** Escucha `asset:transcription_completed`
  - **🔄 Resiliente:** No falla fatalmente, maneja race conditionses

## Modelo de datos principal

### Tablas principales del Kernel v4.0

- `packages/db/src/schema/fluxcore-signals.ts`
  - journal principal de señales certificadas
  - **🆕 Soporta `AI_RESPONSE_GENERATED`**
- `packages/db/src/schema/fluxcore-outbox.ts`
  - outbox de wakeup para projectores
- `packages/db/src/schema/fluxcore-projector-cursors.ts`
  - posición persistente de cada projector

## 🎵 **Flujo de Transcripción de Audio v4.0**

### **Arquitectura Coordinada por el Kernel:**

1. **Usuario envía audio** → ChatCore persiste mensaje con `isPendingAudioTranscription`
2. **Media Orchestrator** detecta audio → `AudioEnrichmentService` transcribe con Whisper
3. **Event Bus:** `asset:transcription_completed` se emite
4. **ChatProjector escucha** → Actualiza mensaje con transcripción
5. **Kernel encola** para IA con texto transcrito
6. **FluxCore genera respuesta** → Certifica `AI_RESPONSE_GENERATED`
7. **ChatProjector entrega** → ChatCore distribuye respuesta

### **Ventajas del Flujo v4.0:**

- **🔒 Soberanía:** Todo el flujo queda certificado en el Kernel
- **🔄 Coordinación:** La IA responde al texto transcrito, no al audio crudo
- **📊 Auditoría:** Todo el flujo queda en el journal del Kernel
- **🎯 Precisión:** Si la transcripción falla, no se encola para IA

---

## 🚨 **Lecciones Aprendidas v4.0**

### **Errores Comunes y Soluciones:**

1. **❌ Bloqueo de Projector:** Antes fallaba fatalmente si no encontraba identidad
   - **✅ Solución v4.0:** ChatProjector es resiliente, no bloquea el pipeline

2. **❌ Audio sin Transcripción:** La IA no podía procesar audio
   - **✅ Solución v4.0:** Flujo coordinado Audio → Whisper → Kernel → IA

3. **❌ Debug Difícil:** Logs invisibles si fallaba transacción
   - **✅ Solución v4.0:** Debug extensivo fuera de transacción

### **Patrones Recomendados:**

```typescript
// ✅ Logs fuera de transacción (siempre visibles)
console.log(`[Kernel] 🔍 DEBUG: Starting gates validation...`);
return db.transaction(async (tx) => {
  // Lógica dentro de transacción
});

// ✅ ChatProjector resiliente
if (!address || !link) {
  console.log(`Identity not ready, deferring...`);
  return; // NO throw error, NO bloquea
}

// ✅ Eventos de transcripción
coreEventBus.on('asset:transcription_completed', async (payload) => {
  await this.handleTranscriptionCompleted(payload);
});
```

---

## 📋 **Checklist de Implementación v4.0**

### **Para Nuevas Features:**

- [ ] ¿La señal usa un `PhysicalFactType` permitido?
- [ ] ¿El Reality Adapter está registrado correctamente?
- [ ] ¿El driverId coincide con `this.DRIVER_ID`?
- [ ] ¿La firma HMAC se genera con el canonical correcto?
- [ ] ¿Los logs de debug están fuera de la transacción?

### **Para Audio/Transcripción:**

- [ ] ¿Se detecta audio pendiente en `parseEvidence()`?
- [ ] ¿Se escucha `asset:transcription_completed`?
- [ ] ¿Se actualiza el mensaje con la transcripción?
- [ ] ¿Se encola para IA solo después de transcribir?

### **Para Projectors:**

- [ ] ¿El projector es resiliente a fallos de identidad?
- [ ] ¿Usa `return` en lugar de `throw` para casos recuperables?
- [ ] ¿Actualiza el cursor atómicamente?

---

## 🎯 **Próximos Pasos**

1. **Documentación:** Mantener estos documentos sincronizados con el código
2. **Testing:** Tests específicos para flujo de transcripción
3. **Monitorización:** Dashboards para salud del Kernel
4. **Optimización:** Reducir logs en producción (debug solo en dev)

**El Kernel v4.0 es la base sólida para flujos multimodales complejos, manteniendo la soberanía mientras permite coordinación sofisticada entre mundos.**
- `packages/db/src/schema/fluxcore-projector-errors.ts`
  - errores de proyección y retry posterior
- `packages/db/src/schema/fluxcore-reality-adapters.ts`
  - registro de adapters autorizados por el Kernel

## Interacción con ChatCore

ChatCore no escribe directamente en el journal. Lo hace por medio de reality adapters:

- `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`
  - certifica mensajes autenticados como observaciones físicas (`EXTERNAL_INPUT_OBSERVED`)
  - certifica cambios de estado estructural (`EXTERNAL_STATE_OBSERVED` con `stateChange`)
- `apps/api/src/services/fluxcore/chatcore-webchat-gateway.service.ts`
  - certifica mensajes y eventos de identidad del widget/webchat

### 🔄 **Flujo de Certificación de Mutaciones (2026-03-13)**
```
Usuario elimina mensaje → message-deletion.service.ts
↓ Sobrescribe mensaje en BD
↓ ChatCoreGateway.certifyStateChange()
↓ Firma con HMAC-SHA256
↓ Kernel.ingestSignal()
↓ Persiste en fluxcore_signals (#554)
↓ ChatProjector.processSignal()
↓ Procesa mutación estructural
```

Una vez certificada la señal, el Kernel la escribe en `fluxcore_signals`. Luego los projectores la observan. Para ChatCore, el projector clave es `chat-projector.ts`, porque convierte señales del Kernel en acciones conversacionales entregadas otra vez al mundo del chat.

## Interacción con FluxCore

FluxCore tampoco salta el Kernel. Cuando FluxCore decide responder:

- `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
  - certifica una señal `AI_RESPONSE_GENERATED`
  - el Kernel la ingiere y la deja en `fluxcore_signals`
- `ChatProjector` la observa y delega la entrega a ChatCore

### � **Trazas Enriquecidas (2026-03-15)**
Las señales `AI_RESPONSE_GENERATED` ahora incluyen contexto completo:
```json
{
  "evidenceRaw": {
    "context": {
      "model": "llama-3.1-8b-instant",
      "provider": "groq",
      "runtimeId": "asistentes-local",
      "policyContext": {
        "accountId": "3e94f74e-e6a0-4794-bd66-16081ee3b02d",
        "mode": "auto",
        "activeRuntimeId": "asistentes-local",
        "authorizedTemplates": 2
      }
    }
  }
}
```

**Flujo de propagación de contexto:**
```
CognitiveDispatcher (tiene runtimeConfig) 
    ↓ pasa runtimeConfig
ActionExecutor.execute (recibe runtimeConfig)
    ↓ pasa runtimeConfig  
executeSendMessage (recibe runtimeConfig)
    ↓ usa runtimeConfig
certifyAiResponse (recibe model/provider reales)
    ↓ incluye en evidenceRaw
Kernel Console (muestra datos reales)
```

### �📊 **Estado Actual del Flujo ChatCore → Kernel → FluxCore**
- **✅ ChatCore → Kernel:** Certificación de mutaciones funcionando
- **⏳ Kernel → FluxCore:** Señales persistiendo, procesamiento de mutaciones verificado
- **🔍 Pendiente:** Verificar impacto en respuestas cognitivas

Esto impone una separación importante:

- FluxCore decide
- Kernel certifica
- ChatCore entrega

## Frontera del dominio

El Kernel sí hace:

- certificación y journal de hechos
- validación de adapters y firmas
- coordinación log-driven de projectores

El Kernel no hace:

- persistencia de mensajes de chat como responsabilidad primaria
- selección de runtime
- policy context
- ejecución directa de acciones de negocio
- broadcasting a clientes
