# Kernel Bootstrap & Runtime — Evidencia Operativa (2026-02-27)

**Objetivo:** documentar, con respaldo de código, cómo se inicializa el Kernel de FluxCore, cuál es su visión, y cómo se integra con el resto de la infraestructura de Chatcore.

---

## 1. Visión soberana del Kernel

- El Kernel es el **“Sovereign Reality Certifier”**: únicamente afirma que FluxCore recibió evidencia física a través de un Reality Adapter autorizado. No conoce conversaciones ni UI, y está congelado por RFC-0001. @apps/api/src/core/kernel.ts#5-221
- El Canon describe que FluxCore separa dominios (ChatCore, FluxCore, Sistemas externos) y que el Kernel es el Journal inmutable que registra observaciones físicas y permite reconstruir todo el estado leyendo `fluxcore_signals` en orden. @docs/fluxcore/FLUXCORE_CANON_FINAL_v8.3.md#27-210
- La fundación del Kernel prohíbe mutaciones del Journal, fija los seis `fact_type`, y obliga a que solo adapters `SENSOR/GATEWAY` firmen señales antes de llamar `kernel.ingestSignal`. @docs/fluxcore/FLUXCORE_KERNEL_FOUNDATION.md#1-200

### Invariantes operativos
1. `kernel.ingestSignal()` es el **único** punto de entrada, valida 5 gates (tipo físico, registro del adapter, clase ≠ INTERPRETER, driver, firma HMAC) y escribe Journal + Outbox en la misma transacción. @apps/api/src/core/kernel.ts#22-221
2. Todo SystemFact genera una entrada en `fluxcore_outbox`, lo que garantiza que los proyectores despierten. @apps/api/src/core/kernel.ts#142-215
3. Los Reality Adapters se registran en DB (`fluxcore_reality_adapters`), y su firma controla la autenticidad de cada señal. @docs/fluxcore/FLUXCORE_CANON_FINAL_v8.3.md#202-235

---

## 2. Kernel Bootstrap

### 2.1 Manifest discovery
`bootstrapKernel` recorre `/extensions`, carga cada `manifest.json`, valida permisos y registra las extensiones disponibles para el runtime. Esto ocurre antes de iniciar los componentes cognitivos para asegurar que las capacidades declaradas estén disponibles. @apps/api/src/bootstrap/kernel.bootstrap.ts#1-30 @apps/api/src/services/manifest-loader.service.ts#74-196

### 2.2 Kernel runtime standalone
`apps/api/src/kernel-runtime.ts` ejecuta el proceso dedicado del Kernel:
1. **Bootstrap**: asegura que los manifests estén cargados.
2. **KernelDispatcher.start()**: activa el loop que sondea el outbox.
3. **startProjectors()**: levanta proyectores (identidad, chat, sesión) y los conecta al `coreEventBus`.
4. **MessageDispatchService.init()**: registra listeners para `core:message_received` y enlaza la capa cognitiva. @apps/api/src/kernel-runtime.ts#1-45

El archivo también maneja señales del sistema (SIGINT/SIGTERM) para detener el dispatcher ordenadamente. @apps/api/src/kernel-runtime.ts#35-45

### 2.3 Arranque dentro del servidor principal
`server.ts` replica esta secuencia cuando la API HTTP se inicia:
1. `kernelDispatcher.start()`
2. `startProjectors()`
3. `bootstrapKernel()`
4. Inicialización de servicios (automation, WES, media orchestrator, message dispatch, runtimes) y worker cognitivo si `fluxNewArchitecture` está activo. @apps/api/src/server.ts#494-527

Esto asegura que, incluso cuando el proceso principal de Bun corre todo, el Kernel mantenga su orden canónico y los servicios dependientes (runtimes, CognitionWorker) estén sincronizados.

---

## 3. Componentes del runtime

### 3.1 KernelDispatcher — Heartbeat
Poller que lee `fluxcore_outbox` cada segundo, marca las filas como procesadas y emite un único `kernel:wakeup` al `coreEventBus`. No transporta datos; sólo despierta proyectores. @apps/api/src/core/kernel-dispatcher.ts#1-61

### 3.2 BaseProjector & ProjectorRunner
- `BaseProjector` implementa el contrato de lectura log-driven: procesa lotes `sequence_number > cursor`, ejecuta la proyección dentro de una transacción y mantiene `fluxcore_projector_errors` para retries deterministas. @apps/api/src/core/kernel/base.projector.ts#1-151
- `startProjectors()` realiza un **cold replay** al arrancar y luego se suscribe a `kernel:wakeup` para seguir procesando. @apps/api/src/core/kernel/projector-runner.ts#1-34

### 3.3 Proyectores activos
- **IdentityProjector**: convierte señales físicas en actores soberanos, maneja `visitor_token` y vincula identidades reales, usando exclusivamente datos de `fluxcore_signals` + `fluxcore_addresses`. @apps/api/src/services/fluxcore/identity-projector.service.ts#1-227
- **ChatProjector**: materializa mensajes e interacciones; en su flujo moderno crea mensajes, vincula conversaciones y encola turnos cognitivos, asegurando que la IA sólo actúe tras una señal certificada. @apps/api/src/core/projections/chat-projector.ts#1-200
- **SessionProjector** (servicio): sostiene la proyección de sesiones soberanas expuesta vía `/kernel/sessions/active`. @apps/api/src/routes/kernel-sessions.routes.ts#1-30

---

## 4. Uso del Kernel en la infraestructura

1. **Ingesta de eventos**: los Reality Adapters (e.g. `chatcore-gateway`, `chatcore-webchat-gateway`) firman eventos y llaman `kernel.ingestSignal`. Las señales quedan ordenadas globalmente mediante `sequence_number`. @apps/api/src/core/kernel.ts#22-221
2. **Despertar + proyección**: el Dispatcher escribe `kernel:wakeup`; los proyectores leen el Journal, actualizan sus tablas derivadas y, en el caso de chat, crean mensajes y encolan turnos para IA. @apps/api/src/core/kernel-dispatcher.ts#1-61 @apps/api/src/core/projections/chat-projector.ts#1-200
3. **Capa cognitiva**: `messageDispatchService` escucha `core:message_received`, resuelve `PolicyContext`, y delega al runtime Gateway o al `CognitionWorker`, según `featureFlags`. @apps/api/src/services/message-dispatch.service.ts#1-204
4. **Servir clientes**: las rutas HTTP/WS leen las proyecciones (conversaciones, sesiones, mensajes). Ninguna ruta escribe directamente en el Kernel; sólo consumen estado proyectado o invocan servicios que, a su vez, pasan por Reality Adapters establecidos.

---

## 5. Diagnóstico y observabilidad

- Logs diagnósticos dentro del Kernel permiten rastrear cada `ingest_start`, `ingest_stored` o `ingest_duplicate`, lo que facilita auditorías de eventos físicos. @apps/api/src/core/kernel.ts#85-215
- `fluxcore_projector_errors` almacena cualquier fallo en proyecciones, con retry automático en el siguiente wake-up. @apps/api/src/core/kernel/base.projector.ts#57-118
- La API expone sesiones activas mediante `kernel/sessions`, útil para validar que el SessionProjector mantiene la realidad de autenticación. @apps/api/src/routes/kernel-sessions.routes.ts#1-30

---

## 6. Riesgos y próximos pasos

1. **Atomicidad estricta**: aunque `BaseProjector` ya envuelve `project + updateCursor` en la misma transacción, cualquier proyector nuevo debe respetar este patrón y usar el `tx` provisto para todas las escrituras derivadas. @apps/api/src/core/kernel/base.projector.ts#57-118
2. **Idempotencia en dominios derivados**: asegurar que tablas como `messages` tengan constraints (`signal_id`) alineados con la proyección para evitar duplicados cuando se reprocesa historia. @apps/api/src/core/projections/chat-projector.ts#7-40
3. **Monitor de adapters**: mantener actualizada la tabla `fluxcore_reality_adapters` y los secrets, dado que cualquier cambio rompe la firma HMAC y bloquea la ingesta. @docs/fluxcore/FLUXCORE_CANON_FINAL_v8.3.md#202-235
4. **Cognition queue**: el ChatProjector debe ser la única pieza que encola turnos IA para evitar divergencias entre observación física y ejecución cognitiva. @apps/api/src/services/message-dispatch.service.ts#75-135

---

## 7. Conclusión

El Kernel está plenamente operativo: valida reality adapters, persiste observaciones en un Journal inmutable y despierta proyectores que mantienen el estado de chat, identidad y sesiones. El bootstrap garantiza que las extensiones estén registradas antes de correr los projectores y que el dispatcher nunca se quede sin latidos. Todo consumo aguas arriba (mensajería, IA, UI) depende de esta cadena: **Reality Adapter → Kernel → Dispatcher → Projectores → Servicios de dominio**.
