# Kernel — componentes e invariantes de implementación actual

## Objetivo de este documento

Este documento describe las piezas concretas que hoy implementan el Kernel en el código. El foco está puesto en la ingesta soberana, el journal, el mecanismo de activación y la infraestructura de projectores.

## 1. Punto de entrada soberano

### `kernel.ts`

- `apps/api/src/core/kernel.ts`

Responsabilidades observables:

- exponer `ingestSignal(candidate)` como entrada única de señales certificadas
- validar que el `factType` pertenezca al conjunto permitido por la implementación actual
- verificar existencia del adapter en `fluxcore_reality_adapters`
- verificar clase del adapter y evitar `INTERPRETER`
- verificar coincidencia de `driverId`
- verificar firma HMAC del candidato canonizado
- persistir la señal y el outbox del Kernel en la misma transacción
- resolver idempotencia por `provenanceExternalId` y por `signalFingerprint`
- emitir `kernel:wakeup` después del commit

## 2. Gates de validación antes del journal

La implementación actual en `kernel.ts` aplica, en este orden:

1. validación del tipo de hecho
2. lookup del reality adapter autorizado
3. bloqueo de adapters `INTERPRETER`
4. verificación de `driverId`
5. verificación criptográfica de firma

Esto confirma que el Kernel actual sigue siendo una frontera defensiva, no un simple repositorio de eventos.

## 3. Journal y outbox del Kernel

### Journal principal

- `packages/db/src/schema/fluxcore-signals.ts`

Responsabilidades observables:

- almacenar señales certificadas en orden secuencial
- preservar evidencia, procedencia y metadata de certificación
- servir de fuente de verdad para projectores

### Outbox del Kernel

- `packages/db/src/schema/fluxcore-outbox.ts`

Responsabilidades observables:

- registrar que una señal nueva debe despertar procesamiento posterior
- desacoplar ingesta del procesamiento de projectores

### Observación relevante sobre columnas

El esquema TS actual de `fluxcore_outbox` expone columnas como `signalId`, `eventType`, `payload`, `status`, `attempts`. El código de `kernel.ts` inserta precisamente en ese outbox luego de persistir el journal. En términos de comportamiento, el outbox del Kernel hoy es una cola de wakeup basada en la señal ya persistida.

## 4. Registro de adapters de realidad

- `packages/db/src/schema/fluxcore-reality-adapters.ts`

Responsabilidades observables:

- registrar adapters autorizados
- asociar cada adapter con un `driverId`
- mantener estado operacional del adapter

Desde `kernel.ts`, el registro de adapters funciona como ACL soberana: si el adapter no existe o no coincide con el driver, la señal no entra al journal.

## 5. Dispatcher de wakeup

### `kernel-dispatcher.ts`

- `apps/api/src/core/kernel-dispatcher.ts`

Responsabilidades observables:

- hacer polling de `fluxcore_outbox`
- emitir `kernel:wakeup`
- activar el loop de projectores sin transportar semántica de negocio

Este componente no interpreta señales. Solo funciona como latido o disparador log-driven.

## 6. Infraestructura base de projectores

### Clase base

- `apps/api/src/core/kernel/base.projector.ts`

Responsabilidades observables:

- leer señales posteriores al cursor del projector
- procesarlas en orden
- ejecutar escritura derivada + avance de cursor en la misma transacción
- registrar errores en `fluxcore_projector_errors`
- evitar avance de cursor cuando una proyección falla

### Runner

- `apps/api/src/core/kernel/projector-runner.ts`

Responsabilidades observables:

- cold start de projectores
- replay del journal al iniciar el proceso
- suscripción al evento `kernel:wakeup`
- coordinación de múltiples projectores activos

### Persistencia de control

- `packages/db/src/schema/fluxcore-projector-cursors.ts`
- `packages/db/src/schema/fluxcore-projector-errors.ts`

Responsabilidades observables:

- guardar la última `sequenceNumber` procesada por cada projector
- registrar errores de proyección, intentos y resolución

## 7. Projectores observados en el código actual

### `IdentityProjector`

- `apps/api/src/services/fluxcore/identity-projector.service.ts`

Responsabilidades observables:

- resolver actores desde señales del journal
- manejar actores autenticados
- crear actor provisional para `visitorToken`
- materializar vínculo visitante → cuenta al observar `CONNECTION_EVENT_OBSERVED`

### `ChatProjector`

- `apps/api/src/core/projections/chat-projector.ts`

Responsabilidades observables:

- traducir señales relevantes del Kernel al mundo conversacional
- encolar turnos en `fluxcore_cognition_queue`
- devolver respuestas `AI_RESPONSE_GENERATED` al dominio ChatCore mediante `messageCore.receive()`

### `SessionProjector`

- `apps/api/src/services/session-projector.service.ts`

Responsabilidades observables:

- proyectar eventos de login y ciclo de vida de sesión
- mantener `fluxcore_session_projection`
- derivar estados `pending`, `active`, `invalidated`

## 8. Flujo operativo real del Kernel

Flujo observable cuando un adapter certifica una observación:

1. el adapter arma `KernelCandidateSignal`
2. llama a `kernel.ingestSignal()`
3. el Kernel valida gates y firma
4. inserta en `fluxcore_signals`
5. inserta wakeup en `fluxcore_outbox`
6. emite `kernel:wakeup`
7. `ProjectorRunner` despierta projectores
8. cada projector avanza desde su cursor y materializa estado derivado

## 9. Fronteras del dominio Kernel

El Kernel sí hace:

- certificación de señales
- journal inmutable y secuencial
- control de adapters autorizados
- wakeup de proyección
- soporte transaccional para replay y reconstrucción

El Kernel no hace:

- persistencia primaria del dominio conversacional
- rendering ni broadcasting a clientes
- selección de runtimes
- construcción de `PolicyContext`
- ejecución directa de acciones de negocio

## 10. Observaciones importantes del código actual

### Conjunto de fact types aceptados por la implementación

En `apps/api/src/core/kernel.ts`, `PHYSICAL_FACT_TYPES` incluye además de las clases físicas más esperables:

- `chatcore.message.received`
- `AI_RESPONSE_GENERATED`

Esto significa que la implementación actual del Kernel acepta hoy un conjunto de hechos más amplio que el modelo mínimo más estricto documentado en otras piezas conceptuales. Para la reconstrucción basada en código, este comportamiento debe considerarse real.

### Separación aún visible entre semántica y soberanía

Aun con esas extensiones, la estructura sigue conservando la separación central:

- los adapters certifican
- el Kernel registra
- los projectores derivan
- otros dominios consumen el estado derivado
