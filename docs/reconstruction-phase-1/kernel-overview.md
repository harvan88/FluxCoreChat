# Kernel — visión general estructural

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

## Rol del dominio

El Kernel es el certificador soberano de realidad del sistema. Su función es aceptar únicamente señales certificadas por adapters autorizados, validarlas y registrarlas como journal inmutable. El Kernel no interpreta negocio conversacional ni lógica cognitiva. Su trabajo es garantizar que el sistema solo avance a partir de hechos certificados.

## Definición canónica validada

La definición histórica que hoy sigue siendo válida es que el Kernel funciona como frontera soberana de certificación y journalización, no como una capa de negocio.

La parte del canon que debe leerse con matiz es el conjunto exacto de tipos físicos permitidos: la idea de superficie estricta sigue vigente, pero la implementación actual ya muestra una superficie de señales más amplia que la formulación histórica más reducida.

## Responsabilidades principales

- validar que una señal pertenezca a un tipo físico permitido
- verificar que el adapter que certifica la señal exista y esté autorizado
- verificar firma y consistencia de la señal certificada
- persistir la señal en el journal inmutable
- escribir en el outbox del Kernel para despertar procesamiento posterior
- servir de fuente de verdad para projectores

## Componentes principales

### 1. Ingesta soberana

- `apps/api/src/core/kernel.ts`
  - define la clase `Kernel`
  - `ingestSignal()` es la entrada soberana de hechos al sistema
  - valida tipo de hecho, adapter, driver y firma HMAC
  - persiste la señal en el journal del Kernel

### 2. Activación de procesamiento

- `packages/db/src/schema/fluxcore-outbox.ts`
  - outbox del Kernel usado para despertar procesamiento posterior
- `apps/api/src/core/kernel-dispatcher.ts`
  - hace polling de `fluxcore_outbox`
  - no transporta payloads de negocio
  - emite solo la interrupción `kernel:wakeup`
- `apps/api/src/core/events.ts`
  - bus de eventos local que transporta `kernel:wakeup` y `kernel:cognition:wakeup`

### 3. Proyección del journal

- `apps/api/src/core/kernel/base.projector.ts`
  - contrato base de todos los projectores
  - asegura cursor atómico, replay, registro de errores y retry desde cursor
- `apps/api/src/core/kernel/projector-runner.ts`
  - arranca los projectores actuales y los despierta en cada `kernel:wakeup`
  - hoy registra:
    - `identityProjector`
    - `chatProjector`
    - `sessionProjector`
- `packages/db/src/schema/fluxcore-projector-cursors.ts`
  - cursor persistente por projector
- `packages/db/src/schema/fluxcore-signals.ts`
  - journal inmutable consultado por projectores

## Modelo de datos principal

### Tablas principales del Kernel

- `packages/db/src/schema/fluxcore-signals.ts`
  - journal principal de señales certificadas
- `packages/db/src/schema/fluxcore-outbox.ts`
  - outbox de wakeup para projectores
- `packages/db/src/schema/fluxcore-projector-cursors.ts`
  - posición persistente de cada projector
- `packages/db/src/schema/fluxcore-projector-errors.ts`
  - errores de proyección y retry posterior
- `packages/db/src/schema/fluxcore-reality-adapters.ts`
  - registro de adapters autorizados por el Kernel

## Interacción con ChatCore

ChatCore no escribe directamente en el journal. Lo hace por medio de reality adapters:

- `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`
  - certifica mensajes autenticados como observaciones físicas
- `apps/api/src/services/fluxcore/chatcore-webchat-gateway.service.ts`
  - certifica mensajes y eventos de identidad del widget/webchat

Una vez certificada la señal, el Kernel la escribe en `fluxcore_signals`. Luego los projectores la observan. Para ChatCore, el projector clave es `chat-projector.ts`, porque convierte señales del Kernel en acciones conversacionales entregadas otra vez al mundo del chat.

## Interacción con FluxCore

FluxCore tampoco salta el Kernel. Cuando FluxCore decide responder:

- `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
  - certifica una señal `AI_RESPONSE_GENERATED`
- el Kernel la ingiere y la deja en `fluxcore_signals`
- `ChatProjector` la observa y delega la entrega a ChatCore

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
