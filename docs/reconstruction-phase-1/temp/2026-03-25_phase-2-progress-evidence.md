# Evidencia inicial — Fase 2: Observabilidad mínima obligatoria

**Fecha:** 2026-03-25
**Fase:** 2
**Estado:** in_progress
**Documento fuente:** `2026-03-25_phase-2-observability-plan.md`

---

## 1. Estado actual de avance

La Fase 2 quedó **iniciada** y ya cuenta con una primera implementación de endurecimiento mínimo sobre la pista de telemetría del pipeline cognitivo.

El objetivo de esta entrega inicial no fue introducir un trace store nuevo, sino mejorar la utilidad operativa y el aislamiento multicuenta del stream técnico existente.

---

## 2. Cambios implementados

### 2.1 Contrato de telemetría endurecido

Archivo:
- `apps/api/src/core/telemetry/telemetry.service.ts`

Cambio realizado:
- se añadió `accountId?: string` a `PipelineTelemetryEvent`
- se actualizó `emitTelemetry(...)` para aceptar y propagar `accountId`

Motivo:
- permitir filtrado de telemetría por cuenta y evitar que el stream técnico quede como broadcast implícito entre contextos no relacionados

### 2.2 Pista WebSocket endurecida para Kernel Console

Archivo:
- `apps/api/src/websocket/ws-handler.ts`

Cambios realizados:
- `subscribe_telemetry` ahora requiere:
  - `data.role === 'kernel_console'`
  - `ws.data.userId`
  - `ws.data.accountId`
- el listener de `telemetry:pipeline_step` ahora:
  - elimina sockets sin `accountId`
  - filtra eventos cuyo `payload.accountId` no coincide con la cuenta del socket

Motivo:
- endurecer el aislamiento operativo del stream técnico
- reducir riesgo de exposición transversal de trazas entre cuentas

### 2.3 Propagación de `accountId` a lo largo del pipeline

Archivos ajustados:
- `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`
- `apps/api/src/core/projections/chat-projector.ts`
- `apps/api/src/workers/cognition-worker.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
- `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
- `apps/api/src/core/message-core.ts`

Cambio realizado:
- los eventos `telemetry:pipeline_step` emitidos por esos componentes ahora incluyen `accountId`

Resultado esperado:
- el stream de Kernel Console puede recibir únicamente la porción de pipeline correspondiente a la cuenta del socket

---

## 3. Verificación realizada

### 3.1 Verificación estructural

Se confirmó por inspección que el pipeline emite telemetría en los 7 pasos mínimos:

- `ingreso`
- `proyeccion`
- `worker`
- `dispatcher`
- `runtime`
- `certificacion`
- `entrega`

### 3.2 Verificación de endurecimiento

Se confirmó por búsqueda focalizada que los siguientes emisores ya propagan `accountId`:

- `chatcore-gateway.service.ts`
- `chat-projector.ts`
- `cognition-worker.ts`
- `cognitive-dispatcher.service.ts`
- `runtime-gateway.service.ts`
- `cognition-gateway.service.ts`
- `message-core.ts`

### 3.3 Validación técnica disponible

Se ejecutó una compilación focalizada sobre archivos relacionados con la mejora.

Resultado:
- la validación global sigue fallando por errores previos del repositorio no relacionados con Fase 2
- el reporte no señaló errores nuevos en los archivos intervenidos por esta mejora

### 3.4 Evidencia empírica disponible — flujo sano observado

Se dispone ya de una primera reconstrucción empírica de flujo sano a partir del terminal de desarrollo activo.

Caso observado:

- `conversationId`
  - `b4b58580-b589-4cc4-a1db-7e4122140a25`

- `runtimeUsed`
  - `asistentes-local`

- `triggerSignalId` de la respuesta AI entregada
  - `1058`

- `signalId` certificado de la respuesta AI
  - `1059`

- `messageId` persistido y entregado por ChatCore
  - `dbc96df0-ed96-4e40-a054-00e174d0e68e`

Secuencia verificada en logs:

- `CognitionWorker` reporta éxito de delegación del turno
- `ActionExecutor` reporta ejecución completa satisfactoria
- `CognitionGateway` certifica la respuesta AI como signal `#1059`
- `ChatProjector` procesa `AI_RESPONSE_GENERATED` para la misma conversación
- `MessageCore` persiste el mensaje AI con `triggerSignalId: "1058"`
- `WebSocket` difunde el mensaje al subscriber de la relación
- `ChatProjector` confirma entrega vía ChatCore con `msgId=dbc96df0-ed96-4e40-a054-00e174d0e68e`

Interpretación operativa:

- ya existe evidencia empírica de que el pipeline sano puede reconstruirse al menos desde `runtime`/`certificacion` hasta `entrega` usando fuentes operativas reales,
- aun si `Live Cognitive Pipeline` no refleja visualmente ese recorrido.

### 3.5 Regla mínima oficial de correlación

Para Fase 2 se adopta la siguiente regla mínima oficial de correlación:

- **`RMC-1` — clave primaria de agrupación**
  - toda reconstrucción debe agruparse primero por `conversationId`

- **`RMC-2` — referencia técnica del turno**
  - la referencia técnica del turno es el `signalId` de ingreso humano al Kernel cuando exista
  - en la pista actual esa referencia aparece propagada de forma transicional como `lastSignalSeq` y/o `triggerSignalId`

- **`RMC-3` — `messageId` de telemetría no es identificador universal estable**
  - el campo `messageId` en `telemetry:pipeline_step` debe interpretarse como referencia operacional del paso, no como identificador universal único de toda la ejecución
  - por esa razón no debe usarse aislado como única clave de correlación

- **`RMC-4` — enlace de certificación**
  - el paso `certificacion` debe enlazar hacia atrás con `metadata.triggerSignalId` y hacia adelante con `metadata.newSignalId`

- **`RMC-5` — enlace de entrega**
  - el paso `entrega` se considera validado cuando para la misma `conversationId` existe:
    - persistencia de mensaje AI en `MessageCore`
    - `messageId` final de ChatCore/WebSocket
    - y referencia al `triggerSignalId` cuando esté disponible en el envelope

- **`RMC-6` — criterio mínimo de flujo sano**
  - un flujo sano queda empíricamente aceptado si para la misma `conversationId` puede demostrarse:
    - ejecución de runtime
    - certificación en Kernel
    - persistencia/entrega de mensaje AI

### 3.6 Evidencia empírica disponible — flujo con fallo reproducible

Se capturó un flujo con fallo real en el terminal de desarrollo, ejecutado deliberadamente sin credenciales IA disponibles para `groq` ni `openai`.

Caso observado:

- `conversationId`
  - `b4b58580-b589-4cc4-a1db-7e4122140a25`

- `turnId`
  - `833`

- `lastSignalSeq`
  - `1061`

- `runtimeUsed`
  - `asistentes-local`

- `firma de error`
  - `[AsistentesLocal] ❌ LLM call failed: No API key configured for providers: groq, openai`

Secuencia verificada en logs:

- `CognitiveDispatcher` resuelve `mode=auto`
- `Runtime selection` elige `@fluxcore/asistentes → asistentes-local`
- `RuntimeGateway` invoca `Asistentes Local (v8.3)` para la conversación
- `AsistentesLocal` falla por ausencia de credenciales IA
- el runtime devuelve una acción `no_action`
- `ActionExecutor` ejecuta esa acción sin producir respuesta conversacional
- `CognitionWorker` registra la delegación como técnicamente exitosa pero con `Actions executed: no_action`

Interpretación operativa:

- este caso demuestra que puede existir ejecución cognitiva con cierre técnico del turno pero sin entrega final de mensaje AI,
- por lo tanto la ausencia de respuesta visible no implica necesariamente ausencia de ejecución del pipeline,
- y el fallo queda localizable en el paso `runtime`, con firma de error reproducible.

### 3.7 Evidencia FINAL Empírica — Cierre de Fase 2 (v8.3 Consolidado)

Se ha capturado el flujo completo de una interacción real tras la consolidación de la arquitectura "Plataforma Primero". Esta traza constituye la prueba de vida definitiva de la observabilidad determinística del pipeline.

**Caso Observado (Logs de Producción Local):**
- **Signal Ingress (Humano):** `#1088` (`EXTERNAL_INPUT_OBSERVED`)
  - `requestId`: `msg-1774553718796-535949b8-58a9-4310-87a7-42a2480f5746`
- **Cognición (Turno):** `#848`
  - Vinculado a `last_signal_seq: 1088`
- **Signal Egress (IA):** `#1089` (`AI_RESPONSE_GENERATED`)
  - Vinculado a `triggerSignalId: 1088`
- **Entrega ChatCore:** `msgId: e9d5fc96-764f-4d2d-8b01-383747124f5a`

**Secuencia de Trazabilidad Verificada:**
1. `ChatCoreGateway` recibe HTTP POST y captura `requestId`.
2. `Kernel` certifica el ingreso como **Signal 1088**.
3. `CognitionWorker` activa el **Turno 848**, inyectando explícitamente la referencia al signal 1088.
4. `RuntimeGateway` invoca al runtime seleccionado (Asistentes Local v8.3).
5. El runtime retorna una acción `send_message`.
6. `ActionExecutor` procesa la acción y solicita certificación al Kernel.
7. `Kernel` emite **Signal 1089**, enlazándolo con el disparador (1088).
8. `ChatProjector` proyecta el signal 1089 hacia `MessageCore`.
9. `MessageCore` persiste el mensaje y lo difunde vía WebSocket con el ID final `e9d5fc96`.

**Conclusión Operativa:**
Se cumple el objetivo de la Fase 2: **Trazabilidad Total**. Cualquier fallo en este recorrido es ahora localizable mediante el ID de señal o el ID de turno.

---

## 4. Cierre de Fase 2

- **Estado:** ✅ VALIDADA (2026-03-26)
- **Criterio de Aceptación:** Se ha demostrado de forma empírica la correlación determinística `Signal Humano -> Turno Cognitivo -> Signal IA -> Mensaje ChatCore`.
- **Habilitante:** Se autoriza el inicio formal de la **Fase 3 (Plataforma de Capabilities)** con la seguridad de contar con un pipeline observable.

---

## 5. Hallazgos relevantes (Actualizado)

*(Se mantienen los hallazgos previos, añadiendo:)*

- **`H1`**
  - la documentación histórica de telemetría sobredimensiona el estado de cierre respecto del roadmap actual

- **`H2`**
  - la semántica de correlación sigue siendo funcional pero todavía transicional
  - algunos pasos usan `triggerSignalId`, otros `last_signal_seq`, y la agrupación final sigue apoyándose en `messageId`

- **`H3`**
  - el sistema sigue sin un trace store persistente dedicado
  - la pista actual continúa siendo efímera por diseño

- **`H4`**
  - `Live Cognitive Pipeline` no puede considerarse fuente de verdad canónica
  - hoy opera como consumidor UI de una pista efímera (`coreEventBus` + WebSocket + estado local) y mantiene deuda visible de correlación/renderizado
  - se observaron casos donde la IA respondió correctamente y la UI siguió mostrando `Esperando tráfico en el Kernel...`

- **`H5`**
  - la ejecución cognitiva sí quedó trazable por fuentes más cercanas al sistema real que la UI del pipeline, incluyendo entrega efectiva de `message:new`, logs operativos de projector/runtime y persistencia derivada en ChatCore
  - por lo tanto, la deuda actual está localizada principalmente en la capa de visualización/consumo de telemetría y no prueba por sí sola una doble fuente de verdad del pipeline cognitivo

- **`H6`**
  - durante la investigación de `Fluxi` se detectó un desalineamiento interno entre `PolicyContext` y `RuntimeConfig`
  - `FluxPolicyContextService` sí resuelve `workDefinitions` de Fluxi, pero `runtime-composition.service.ts` estaba construyendo `runtimeConfig` para `@fluxcore/fluxi` con `workDefinitions: []`
  - eso dejaba a `FluxiRuntime` sin definiciones transaccionales y favorecía retornos `no_action` aun cuando el runtime estaba correctamente seleccionado
  - se aplicó un ajuste mínimo para poblar `runtimeConfig.workDefinitions` desde `workDefinitionService.listLatest(accountId)`

- **`H7`**
  - se formalizó el criterio soberano de `Fluxi`: si el operador selecciona `@fluxcore/fluxi`, el runtime debe responder cualquier input del usuario y no puede quedar silencioso ante mensajes no transaccionales
  - en consecuencia, `FluxiRuntime` fue ajustado para devolver `send_message` como fallback conversacional cuando:
    - no existan `WorkDefinitions`
    - no se detecte intención transaccional
    - falle la interpretación o la extracción de slots
  - `no_action` queda reservado para casos de corte real del pipeline, como `mode=off`, prevención de loop o ausencia de mensaje utilizable

- **`H8`**
  - durante la continuidad de Fase 2 se avanzó en preparación rigurosa de la siguiente fase sin declararla iniciada
  - el código de plataforma ya pasó a reflejar mejor la frontera canónica entre orquestación, contexto autorizado y capacidades compartidas:
    - `RuntimeInput` incorporó un contrato explícito de `authorizedContext` y `RuntimeServices`
    - se creó un factory de plataforma para construir `RuntimeInput` completo desde orquestación
    - `CognitiveDispatcher` dejó de armar inline el contexto autorizado y el wiring de servicios compartidos
    - `tool-registry.service.ts` ya puede operar con dependencias reales inyectadas y filtrar oferta por `authorizedTools`
  - este avance debe interpretarse como preparación técnica de Fase 3, no como apertura real de la fase mientras la validación empírica de observabilidad mínima siga pendiente

- **`H9`**
  - La consolidación de la Phase 3 (Plataforma) ha simplificado la Fase 2, ya que al centralizar la ejecución en el `ActionExecutor`, los puntos de emisión de telemetría son ahora canónicos y no dependen de la implementación interna de cada runtime.

---

## 6. Regla operativa de verdad durante esta fase

Mientras Fase 2 siga abierta, las fuentes operativas se interpretan así:

- **`Kernel` y proyección derivada**
  - siguen siendo la referencia soberana de hechos certificados y efectos observables del sistema

- **`message:new` + entrega conversacional efectiva**
  - son evidencia fuerte de que la ruta operacional principal completó su recorrido suficiente para producir una respuesta

- **logs estructurados de servicios del pipeline**
  - se aceptan como evidencia técnica auxiliar para reconstrucción mientras no exista trace store persistente

- **`Live Cognitive Pipeline`**
  - se considera una vista técnica útil pero no canónica
  - su estado actual no puede utilizarse como gate único para afirmar éxito o fracaso del pipeline

---

## 7. Riesgos pendientes

- **`R1`**
  - aún falta formalizar la regla canónica final de correlación mínima

- **`R2`**
  - aún falta validación empírica explícita de suscripción no autorizada vs suscripción autorizada

- **`R3`**
  - aún falta registrar evidencia de flujo sano y flujo fallido observados operativamente

- **`R4`**
  - persiste deuda específica de `Live Cognitive Pipeline` como consola efímera no confiable para validación formal de fase

- **`R5`**
  - el repositorio todavía exhibe remanentes conceptuales de tool systems/caminos legacy que deberán atacarse en fases posteriores, especialmente al consolidar la plataforma canónica de capabilities y al retirar compatibilidades residuales


---

## 8. Decisión operativa actual

- Fase 2 **permanece abierta**.
- La deuda de `Live Cognitive Pipeline` queda registrada como **deuda de observabilidad técnica/UI**, no como prueba suficiente de múltiples fuentes de verdad del dominio.
- No se declara validación empírica completa de Fase 2.
- Sí queda habilitado avanzar en **preparación rigurosa de Fase 3** para no frenar la reconstrucción, siempre que esa preparación no se presente como apertura real de la fase.

---

## 9. Próximo paso técnico

La siguiente acción correcta dentro de Fase 2 es:

- validar empíricamente el flujo de telemetría de extremo a extremo,
- registrar una regla mínima oficial de correlación,
- y decidir si hace falta un ajuste adicional de contrato antes de considerar la fase lista para cierre.

En paralelo, ya puede prepararse la documentación ejecutable de Fase 3 para que la migración de capabilities no vuelva a mezclar ownership de plataforma, runtime y herramientas legacy.
