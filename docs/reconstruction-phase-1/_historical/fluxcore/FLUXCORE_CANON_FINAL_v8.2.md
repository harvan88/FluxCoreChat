# FLUXCORE — Canon Arquitectónico Definitivo (v8.2)

**Este es el documento supremo y autónomo de FluxCore.**
No depende de ningún documento externo. Todo lo necesario para entender, implementar y mantener el sistema está aquí.
Si el código contradice este documento, el código está en error.

---

## 0. Resumen Ejecutivo

FluxCore es un **Work Operating System (WOS)**: un sistema que permite a una empresa operar su actividad mediante lenguaje natural.

El chat es la interfaz. La IA es un mecanismo. El resultado real son **acciones operativas auditables sobre el mundo**.

El sistema opera sobre cinco invariantes no negociables:

- El **Kernel** es la única fuente de verdad. Todo estado es derivado de él.
- Los **proyectores** son funciones puras y atómicas. No tienen efectos secundarios.
- Los **runtimes** son decisores soberanos. Reciben contexto, devuelven acciones. Todos comparten el mismo contrato.
- La **cognición** se ejecuta sobre hechos certificados del Kernel, después de que la proyección estructural mínima esté materializada.
- La **unidad de decisión cognitiva es el turno conversacional**, no la señal individual. Señales en ráfaga producen una única decisión.

---

## 1. Ontología del Sistema

### 1.1 Los dos sistemas

La arquitectura está formada por dos sistemas con responsabilidades no superpuestas.

#### ChatCore — Sistema de Comunicación

ChatCore es el sistema de mensajería. Sus responsabilidades son: recibir mensajes de canales, persistir conversaciones, emitir eventos al bus, renderizar UI conversacional, exponer activos conversacionales (perfiles, plantillas, participantes, historiales) y proveer infraestructura de configuración extensible.

**ChatCore no contiene inteligencia artificial ni lógica operativa de negocio.**

ChatCore no decide respuestas. No ejecuta operaciones. No conoce runtimes. No sabe que existe la IA. Únicamente transporta información, dispara eventos y renderiza UI.

#### FluxCore — Work Operating System

FluxCore es el cerebro operativo. Se construye sobre un Kernel Soberano que certifica la realidad física antes de cualquier interpretación.

Sus responsabilidades son: certificar observaciones físicas en el Journal inmutable, convertir señales crudas en contexto de negocio, y orquestar runtimes sobre ese contexto.

FluxCore no es el chat. No es el negocio del cliente. Es el **fedatario de la realidad y el motor de decisión**.

### 1.2 Test ontológico de propiedad

Para determinar si un dato pertenece a ChatCore o a FluxCore se aplica esta pregunta:

> ¿Este dato existiría si no hubiera IA en el sistema?

Si la respuesta es **sí** → pertenece a ChatCore.
Si la respuesta es **no** → pertenece a FluxCore.

**Pertenece a ChatCore:** perfil de cuenta (nombre, bio, avatar), conversaciones, mensajes, canales, notas del contacto, templates, bus de eventos, registro de extensiones instaladas.

**Pertenece a FluxCore:** preferencias de atención (tono, emojis, formalidad), reglas por contacto, modo de automatización, runtime activo, instrucciones de sistema para IA, configuración de modelos y providers.

### 1.3 Sistemas de Dominio (externos)

Son los sistemas donde vive la operación real del negocio: agendas, pedidos, catálogos, ERPs, CRMs, pagos, mapas. No pertenecen ni a ChatCore ni a FluxCore. FluxCore permite operarlos mediante conversación, pero no es propietario de ellos.

---

## 2. El Kernel — Journal Inmutable (RFC-0001 — CONGELADO)

### 2.1 Propósito

El Kernel es el único guardián de la realidad certificada. Registra observaciones físicas certificables —hechos universales que no dependen de interpretación de negocio— y garantiza que todo el estado del sistema pueda reconstruirse leyendo el Journal en orden.

**Distinción fundamental:**
- **Fenómeno**: algo que ocurre en el mundo externo.
- **Observación**: evidencia física que FluxCore recibe de ese fenómeno.
- **SystemFact**: la fila en `fluxcore_signals` que certifica haber recibido esa observación.

El Kernel no afirma el fenómeno. Afirma la observación. Todo lo demás —intenciones, identidades, resultados de IA— vive en proyectores.

### 2.2 Esquema SQL del Journal

```sql
CREATE TABLE fluxcore_reality_adapters (
    adapter_id      TEXT PRIMARY KEY,
    driver_id       TEXT NOT NULL,
    adapter_class   TEXT NOT NULL CHECK (adapter_class IN ('SENSOR', 'GATEWAY', 'INTERPRETER')),
    description     TEXT NOT NULL,
    signing_secret  TEXT NOT NULL,
    adapter_version TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fluxcore_signals (
    sequence_number        BIGSERIAL PRIMARY KEY,
    signal_fingerprint     TEXT NOT NULL UNIQUE,
    fact_type              TEXT NOT NULL CHECK (fact_type IN (
        'EXTERNAL_INPUT_OBSERVED',
        'EXTERNAL_STATE_OBSERVED',
        'DELIVERY_SIGNAL_OBSERVED',
        'MEDIA_CAPTURED',
        'SYSTEM_TIMER_ELAPSED',
        'CONNECTION_EVENT_OBSERVED'
    )),
    source_namespace       TEXT NOT NULL,
    source_key             TEXT NOT NULL,
    subject_namespace      TEXT,
    subject_key            TEXT,
    object_namespace       TEXT,
    object_key             TEXT,
    evidence_raw           JSONB NOT NULL,
    evidence_format        TEXT NOT NULL,
    evidence_checksum      TEXT NOT NULL,
    provenance_driver_id   TEXT NOT NULL,
    provenance_external_id TEXT,
    provenance_entry_point TEXT,
    certified_by_adapter   TEXT NOT NULL REFERENCES fluxcore_reality_adapters(adapter_id),
    certified_adapter_version TEXT NOT NULL,
    claimed_occurred_at    TIMESTAMPTZ,
    observed_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CHECK ((subject_namespace IS NULL) = (subject_key IS NULL))
);

-- Inmutabilidad garantizada por triggers
CREATE FUNCTION fluxcore_prevent_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'fluxcore_signals is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fluxcore_no_update
BEFORE UPDATE ON fluxcore_signals FOR EACH ROW
EXECUTE FUNCTION fluxcore_prevent_mutation();

CREATE TRIGGER fluxcore_no_delete
BEFORE DELETE ON fluxcore_signals FOR EACH ROW
EXECUTE FUNCTION fluxcore_prevent_mutation();

CREATE TABLE fluxcore_outbox (
    id              BIGSERIAL PRIMARY KEY,
    sequence_number BIGINT NOT NULL UNIQUE REFERENCES fluxcore_signals(sequence_number),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE fluxcore_projector_cursors (
    projector_name       TEXT PRIMARY KEY,
    last_sequence_number BIGINT NOT NULL DEFAULT 0,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
```

### 2.3 Ontología Física — Los seis tipos de señal

El Kernel **solo** acepta estas seis clases de hechos físicos. Toda semántica de negocio se deriva en proyectores.

**`EXTERNAL_INPUT_OBSERVED`** — Un actor externo envió información deliberada hacia el sistema. Ejemplos: mensaje de texto, audio, archivo, click en botón de respuesta rápida. Se proyecta como `Message` o `Interaction` en Chat.

**`EXTERNAL_STATE_OBSERVED`** — Un cambio pasivo en el estado del mundo exterior. Ejemplos: confirmación de lectura (blue check), estado "escribiendo", cambio de perfil. Se proyecta como actualización de metadatos de `Conversation` o `Participant`.

**`DELIVERY_SIGNAL_OBSERVED`** — El canal técnico confirma la entrega de una salida previa del sistema. Ejemplos: ack de recepción (sent/delivered), error de envío. Se proyecta como actualización de estado de `Message`.

**`MEDIA_CAPTURED`** — Ingreso de un activo binario persistente. Ejemplos: imagen subida a S3, documento adjunto procesado. Se proyecta como creación de `Asset`.

**`SYSTEM_TIMER_ELAPSED`** — El paso del tiempo alcanzó un hito agendado internamente. Ejemplos: timeout de espera, scheduler cron. Dispara evaluaciones de políticas o transiciones de Work.

**`CONNECTION_EVENT_OBSERVED`** — Cambios en la topología de conexión del Adapter. Ejemplos: webhook desconectado, re-autenticación requerida. Genera alertas de infraestructura.

### 2.4 Reality Adapters

Los Reality Adapters son el único punto de entrada al Kernel. Reciben observaciones externas, las normalizan a una de las seis clases físicas, las firman criptográficamente con su `signing_secret` y llaman a `kernel.ingestSignal()`.

**Clases permitidas para escribir en el Kernel:** `SENSOR`, `GATEWAY`. Los `INTERPRETER` (IA) jamás escriben en el Kernel.

El Kernel rechaza cualquier señal que no venga de un adapter registrado con firma válida.

---

**Adapters del sistema base (registrados en toda instalación):**

La distinción entre adapters no es la URL ni el dominio. Es **si el backend puede garantizar la identidad del emisor en el momento de certificar la señal**.

| `adapter_id` | `driver_id` | Cuándo usar | Identidad garantizable |
|---|---|---|---|
| `chatcore-gateway` | `chatcore/internal` | Señales generadas desde el backend autenticado de la plataforma. Conversaciones entre cuentas logueadas, acciones de operadores, eventos del sistema. | Siempre. `accountId` resuelto server-side antes de ingestar. |
| `chatcore-webchat-gateway` | `chatcore/webchat` | Señales desde el widget embebible. Puede estar en meetgar.com/perfil-del-cliente o en panaderiadelaesquina.com. El dominio es irrelevante. Lo que importa es que el mensaje viene del browser y el backend no puede verificar quién es el visitante antes de ingestar. | Puede ser anónima. Se usa `visitor_token` como identidad provisional. |

**Adapters de canal externo (opcionales, según integración):**

| `adapter_id` | `driver_id` | Canal |
|---|---|---|
| `whatsapp-gateway` | `whatsapp/cloud-api` | WhatsApp Business Cloud API |
| `telegram-gateway` | `telegram/bot-api` | Telegram Bot API |

Los adapters externos validan su propia firma (HMAC, tokens de verificación) antes de llamar a `ingestSignal()`. FluxCore no conoce WhatsApp ni Telegram; solo conoce señales certificadas.

---

### 2.4.1 El modelo de identidad del widget — visitor_token

El widget de chat genera un `visitor_token` (UUID v4) en el browser al iniciar la sesión. Este token se persiste en `localStorage` para sobrevivir recargas de página. Es el `subject_key` de todas las señales anónimas de ese visitante.

**Anatomía de una señal anónima del widget:**

```typescript
{
  fact_type:          'EXTERNAL_INPUT_OBSERVED',
  certified_by_adapter: 'chatcore-webchat-gateway',
  subject_namespace:  'chatcore/webchat-visitor',
  subject_key:        'vt_a3f9b2c1d4e5...',   // visitor_token generado en browser
  evidence_raw: {
    tenant_id:       'acc_panaderia_123',       // a qué cuenta pertenece el widget
    visitor_token:   'vt_a3f9b2c1d4e5...',
    channel:         'webchat',
    content:         { text: 'hola' },
    widget_origin:   'https://panaderiadelaesquina.com' // informativo, no normativo
  }
}
```

El `tenant_id` es obligatorio. Es el mecanismo por el que el `IdentityProjector` sabe que este visitante anónimo está interactuando con "la Panadería de la Esquina" aunque no sepa quién es el visitante.

**El `IdentityProjector`** al ver la primera señal de un `visitor_token` desconocido crea un actor provisional:

```
actor tipo 'provisional'
  vinculado a tenant_id (la cuenta del cliente)
  identificado por visitor_token
  sin account_id real
```

A partir de ese momento, el `IdentityProjector` resuelve ese `visitor_token` → actor provisional en todas las señales siguientes.

---

### 2.4.2 Vinculación de identidad — visitante anónimo que se autentica

Cuando el visitante se autentica durante la conversación, el hecho debe certificarse como una nueva señal. **El Journal no se muta.** Las señales anónimas anteriores permanecen anónimas porque eso fue lo que ocurrió: eran anónimas en el momento de la observación.

**La señal de vinculación** es un `CONNECTION_EVENT_OBSERVED` certificado por el `chatcore-gateway` (ahora sí el backend tiene identidad verificada):

```typescript
{
  fact_type:          'CONNECTION_EVENT_OBSERVED',
  certified_by_adapter: 'chatcore-gateway',       // backend autenticado
  subject_namespace:  'chatcore/webchat-visitor',
  subject_key:        'vt_a3f9b2c1d4e5...',       // el mismo visitor_token
  object_namespace:   'chatcore/account',
  object_key:         'acc_real_456',              // la cuenta real recién autenticada
  evidence_raw: {
    event:            'visitor_authenticated',
    visitor_token:    'vt_a3f9b2c1d4e5...',
    account_id:       'acc_real_456',
    authenticated_at: '2026-02-18T14:30:00Z'
  }
}
```

**El `IdentityProjector`** al procesar esta señal:
1. Encuentra el actor provisional vinculado al `visitor_token`.
2. Crea un `fluxcore_actor_identity_link` conectando el actor provisional con `acc_real_456`.
3. A partir de esta señal, resuelve ese `visitor_token` → la cuenta real.

**El `ChatProjector`** al procesar esta señal:
1. No crea un mensaje visible.
2. Actualiza el `account_id` de la conversación abierta con ese `visitor_token`.
3. Los mensajes anteriores ya están en `messages`. Ahora pertenecen a la cuenta real.

**Resultado:** El historial completo de la conversación, incluyendo los mensajes anónimos, queda asociado a la cuenta real. El Journal refleja la verdad: los mensajes anteriores fueron enviados de forma anónima; la vinculación ocurrió después y queda registrada como hecho separado.

---

### 2.4.3 Tabla de identidad por escenario

| Escenario | Adapter | `subject_namespace` | `subject_key` | Identidad resuelta por |
|---|---|---|---|---|
| Chat entre cuentas logueadas (meetgar.com) | `chatcore-gateway` | `chatcore/account` | `acc_123` | Backend antes de ingestar |
| Widget en página propia, visitante anónimo | `chatcore-webchat-gateway` | `chatcore/webchat-visitor` | `vt_xxx` | IdentityProjector → actor provisional |
| Widget en dominio externo, visitante anónimo | `chatcore-webchat-gateway` | `chatcore/webchat-visitor` | `vt_xxx` | Ídem |
| Cualquier widget, visitante que se autentica | `chatcore-webchat-gateway` → `CONNECTION_EVENT_OBSERVED` con `chatcore-gateway` | `chatcore/webchat-visitor` | `vt_xxx` → vinculado a `acc_real` | IdentityProjector → identity link |

**SQL de registro de adapters base:**

```sql
INSERT INTO fluxcore_reality_adapters 
  (adapter_id, driver_id, adapter_class, description, signing_secret, adapter_version)
VALUES 
  ('chatcore-gateway', 'chatcore/internal', 'GATEWAY',
   'Certifica mensajes desde el backend autenticado de la plataforma.',
   :chatcore_signing_secret, '1.0.0'),
  ('chatcore-webchat-gateway', 'chatcore/webchat', 'GATEWAY',
   'Certifica mensajes desde el widget embebible. Identidad puede ser provisional.',
   :webchat_signing_secret, '1.0.0')
ON CONFLICT (adapter_id) DO NOTHING;
```

### 2.5 Contrato de ingestión

```typescript
// Solo los Reality Adapters pueden invocar esto
kernel.ingestSignal(candidate: KernelCandidateSignal): Promise<bigint>
```

Internamente, el Kernel valida la firma, calcula el fingerprint, persiste en `fluxcore_signals` y escribe en `fluxcore_outbox` **dentro de la misma transacción**. Emite `kernel:wakeup`.

**Idempotencia:** si existe `provenance_external_id`, la identidad primaria es `(adapter, external_id)`. Si no, el fingerprint `(adapter + source + checksum)` garantiza unicidad. Señales duplicadas devuelven el `sequence_number` existente sin error.

### 2.6 Propiedades garantizadas por el Kernel

- **Inmutabilidad física**: triggers impiden `UPDATE`/`DELETE`. El pasado no puede reescribirse.
- **Orden total global**: `sequence_number` incrementa monotónicamente. Es el reloj lógico del sistema.
- **Tiempo de observación confiable**: `observed_at` usa `clock_timestamp()` de Postgres; ningún proceso puede falsificarlo.
- **Despertar inevitable**: cada señal insertada produce exactamente una entrada en `fluxcore_outbox` en la misma transacción.
- **Separación temporal**: `sequence_number` refleja cuándo el sistema observó el hecho; `claimed_occurred_at` refleja el tiempo reportado por la fuente.

### 2.7 Reglas operativas del Kernel

1. Prohibido introducir `accountId`, `conversationId`, `messageId` o datos de UI en el Journal.
2. Solo adapters registrados con firma válida pueden invocar `ingestSignal()`.
3. Solo adapters clase `SENSOR` o `GATEWAY` pueden certificar observaciones.
4. Toda señal incluye `source` (namespace + key) que describe el origen causal.
5. Ningún fenómeno se certifica sin `evidence_raw`, `format`, `provenance`, checksum y firma.
6. Todo proyector debe reconstruir su estado leyendo `fluxcore_signals ORDER BY sequence_number`. Si no es posible, es un bug.
7. Cada proyector persiste sus writes y actualiza su cursor en la **misma transacción**.
8. El `IdentityProjector` crea actores provisionales para señales del `chatcore-webchat-gateway` con `visitor_token` desconocido. Un actor provisional tiene tipo `provisional` y queda vinculado al `tenant_id` del widget.
9. La vinculación de un visitante anónimo a una cuenta real se certifica como una nueva señal `CONNECTION_EVENT_OBSERVED`. El Journal no se muta. Las señales anteriores permanecen anónimas porque eso fue lo que ocurrió.

---

## 3. Principios Fundamentales de la Arquitectura

### 3.1 Inmutabilidad del Kernel
El Journal es append-only. Toda mutación de estado deriva de él. RFC-0001 está ratificado y congelado. No hay debates sobre el Kernel; el trabajo pasa a adapters y proyectores.

### 3.2 Proyectores puros y atómicos
Cada proyector lee del Journal y escribe en tablas derivadas en una transacción atómica que incluye su cursor. Nunca llama a servicios externos. Nunca genera nuevos hechos. Nunca tiene efectos fuera de la transacción.

### 3.3 Cognición post-proyección estructural
La cognición se dispara desde hechos del Kernel, pero se ejecuta después de que la **proyección estructural mínima** esté materializada: identidad del actor, `accountId`, canal de origen.

Hay dos tipos de proyección:
- **Estructural** (obligatoria antes de cognición): identidad, destinatario, canal, actor.
- **Visual** (para UI): threading, orden de mensajes, última actividad.

El Cognitive Dispatcher depende de la primera. Nunca de la segunda.

### 3.4 Soberanía de runtimes con contrato único
Todos los runtimes implementan el mismo contrato: `handle(input) → ExecutionAction[]`. Un runtime no es especial por su naturaleza (LLM, FSM, reglas). Es un **decisor**: recibe estado del mundo, decide qué hacer, devuelve acciones. El sistema ejecuta las acciones.

Fluxi no necesita un contrato distinto. Necesita una implementación distinta. La diferencia es algorítmica, no ontológica. Si Fluxi pudiera ejecutar efectos directamente, dejaría de ser un decisor y se convertiría en una capa del sistema, reproduciendo el error histórico del ExtensionHost.

### 3.5 Contexto completo
El `PolicyContext` contiene toda la información que el runtime necesita. Los runtimes no acceden a bases de datos ni a servicios externos.

### 3.6 Herramientas mediadas
Los runtimes no ejecutan herramientas. Declaran la intención de usarlas devolviendo una acción. El `ActionExecutor` ejecuta, valida permisos y mantiene trazabilidad.

Desde la perspectiva del runtime, todas las herramientas son idénticas: el runtime declara una acción y el sistema la ejecuta. No importa si la implementación lee tablas de ChatCore, llama al servicio RAG de FluxCore, o invoca un sistema externo. El registro de herramientas siempre es de FluxCore; la implementación puede vivir en cualquier capa.

### 3.7 Reconstruibilidad total
Todo el estado del sistema debe poder regenerarse leyendo `fluxcore_signals ORDER BY sequence_number`. Si no es posible, es un bug de diseño.

### 3.8 Turno conversacional como unidad de decisión
La unidad de ingesta es la señal. La unidad de decisión cognitiva es el turno conversacional. Señales de una misma conversación dentro de una ventana temporal producen una única ejecución cognitiva.

---

## 4. Componentes del Sistema

### 4.1 Proyectores

Implementan `BaseProjector`. Leen señales no procesadas y actualizan tablas derivadas en una transacción atómica.

**Tipos:**

- `IdentityProjector`: Resuelve actores (`accountId`, `contactId`) a partir de señales. Mantiene el grafo de identidad. Es la **proyección estructural mínima**. El Cognitive Dispatcher depende de su output.
- `ChatProjector`: Crea registros en `messages` y `conversations`. Dentro de su transacción, encola en `fluxcore_cognition_queue`. Post-transacción emite `message.received` al Event Bus.
- `WorkProjector`: Mantiene estado de Works activos.
- `SessionProjector`: Proyecta sesiones de usuario.

**Patrón de implementación obligatorio:**

```typescript
async wakeUp() {
  const lastSeq = await this.getCursor();
  const signals = await db.query.fluxcoreSignals.findMany({
    where: gt(fluxcoreSignals.sequenceNumber, lastSeq),
    orderBy: asc(fluxcoreSignals.sequenceNumber),
    limit: 100,
  });

  for (const signal of signals) {
    await db.transaction(async (tx) => {
      await this.project(signal, tx);          // escribe en tablas derivadas
      await this.enqueueCognition(signal, tx); // solo ChatProjector
      await this.updateCursor(signal, tx);     // avanza cursor
    });
    await this.emitDomainEvent(signal);        // post-transacción, no bloquea la tx
  }
}
```

**Idempotencia:** La tabla `messages` tiene `UNIQUE (signal_id)`. Toda inserción usa `ON CONFLICT DO NOTHING`. Sin este constraint, una reconstrucción completa del Journal generaría mensajes duplicados.

---

### 4.2 fluxcore_cognition_queue — Outbox de cognición con Turn-Window

Esta tabla garantiza dos propiedades simultáneas: que ningún mensaje humano se pierda sin respuesta (at-least-once delivery) y que señales en ráfaga dentro de una conversación produzcan una única decisión cognitiva.

**El problema:** Un usuario que escribe "hola / hola?? / estás?" genera tres señales. Sin esta tabla, generaría tres ejecuciones cognitivas independientes → tres respuestas → redundancia, contradicciones, gasto de tokens multiplicado.

```sql
CREATE TABLE fluxcore_cognition_queue (
  id                     BIGSERIAL PRIMARY KEY,
  conversation_id        TEXT NOT NULL,
  account_id             TEXT NOT NULL,
  last_signal_seq        BIGINT NOT NULL REFERENCES fluxcore_signals(sequence_number),
  turn_started_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  turn_window_expires_at TIMESTAMPTZ NOT NULL,
  processed_at           TIMESTAMPTZ,
  attempts               INT NOT NULL DEFAULT 0,
  last_error             TEXT,
  UNIQUE (conversation_id) WHERE processed_at IS NULL
);

CREATE INDEX idx_cognition_queue_ready
  ON fluxcore_cognition_queue(turn_window_expires_at)
  WHERE processed_at IS NULL;
```

**Dos tipos de señal extienden la ventana. Solo una crea mensaje.**

El `ChatProjector` procesa todas las señales entrantes de una conversación. El comportamiento en la cola depende del tipo de señal:

| Tipo de señal | Ejemplo | Acción en `messages` | Acción en cognition_queue |
|---|---|---|---|
| `EXTERNAL_INPUT_OBSERVED` | Mensaje de texto, audio, imagen | Crea registro en `messages` | Upsert: extiende `turn_window_expires_at` en `turnWindowMs` |
| `EXTERNAL_STATE_OBSERVED` (typing/recording) | Usuario escribiendo, grabando audio | No crea mensaje | Upsert: extiende `turn_window_expires_at` en `turnWindowTypingMs` |
| Cualquier otro tipo | Delivery receipt, conexión | No aplica | No toca la cola |

Esta distinción es fundamental: las señales de interacción son evidencia física de que viene más contenido. Disparar cognición mientras el usuario está escribiendo es un error de modelo, no solo de UX. El sistema las reconoce y extiende la ventana sin crear mensajes espurios.

**`turnWindowTypingMs` es mayor que `turnWindowMs`** porque un usuario escribiendo puede tardar 10-20 segundos antes de enviar. Ambos valores son configurables por canal en el `PolicyContext`.

**Comportamiento del ChatProjector al escribir en la cola:**

```sql
-- Para EXTERNAL_INPUT_OBSERVED (mensaje real)
INSERT INTO fluxcore_cognition_queue
  (conversation_id, account_id, last_signal_seq, turn_window_expires_at)
VALUES (:conv_id, :account_id, :seq, now() + :turn_window_ms * interval '1 millisecond')
ON CONFLICT (conversation_id) WHERE processed_at IS NULL
DO UPDATE SET
  last_signal_seq        = EXCLUDED.last_signal_seq,
  turn_window_expires_at = EXCLUDED.turn_window_expires_at;

-- Para EXTERNAL_STATE_OBSERVED con typing/recording
INSERT INTO fluxcore_cognition_queue
  (conversation_id, account_id, last_signal_seq, turn_window_expires_at)
VALUES (:conv_id, :account_id, :seq, now() + :turn_window_typing_ms * interval '1 millisecond')
ON CONFLICT (conversation_id) WHERE processed_at IS NULL
DO UPDATE SET
  -- last_signal_seq NO se actualiza: typing no es el último contenido real
  turn_window_expires_at = GREATEST(
    fluxcore_cognition_queue.turn_window_expires_at,
    now() + :turn_window_typing_ms * interval '1 millisecond'
  );
```

Nótese que para señales de typing, `last_signal_seq` no se actualiza porque el último contenido real sigue siendo el mensaje anterior. Solo se extiende la ventana temporal.

Cada señal nueva de la misma conversación extiende la ventana. El turno se considera cerrado cuando no llegan señales (ni mensajes ni interacciones) durante la ventana completa.

**Query del CognitionWorker:**

```sql
SELECT * FROM fluxcore_cognition_queue
WHERE processed_at IS NULL AND turn_window_expires_at < now()
ORDER BY turn_window_expires_at ASC
LIMIT 10
FOR UPDATE SKIP LOCKED;
```

**Configuración de las ventanas** (políticas, no constantes — viven en `PolicyContext`):

| Canal | `turnWindowMs` | `turnWindowTypingMs` | Razonamiento |
|---|---|---|---|
| WhatsApp | 3000 ms | 15000 ms | Usuarios escriben en ráfagas; typing puede durar 10-20s |
| Telegram | 2000 ms | 10000 ms | Similar a WhatsApp |
| API / web chat | 1000 ms | 5000 ms | Latencia baja; ventanas más cortas |
| Email | 0 ms | 0 ms | Sin ráfagas ni typing |

El tradeoff es explícito: la ventana introduce latencia intencional. Un mensaje que llega solo no recibe respuesta en menos de `turnWindowMs`. Para canales de mensajería, 2-3 segundos es imperceptible y el beneficio operacional es sustancial.

**Invariantes de la cola:**
- Escrita dentro de la transacción del `ChatProjector`. Nunca después.
- Una única entrada pendiente por `conversation_id`.
- `processed_at` se actualiza solo después de que `ActionExecutor` completó sin error.

---

### 4.3 Event Bus (Dominio)

Comunica cambios en proyecciones a consumidores interesados. Los eventos se emiten **después** de la transacción exitosa.

| Evento | Origen | Semántica |
|---|---|---|
| `message.received` | `ChatProjector` | Mensaje humano proyectado. Para UI vía WebSocket. |
| `message.sent` | `ActionExecutor` | Mensaje del sistema insertado como `pending`. Para UI y worker de canal. |
| `work.opened` | `ActionExecutor` | Work creado. |
| `work.advanced` | `ActionExecutor` | Transición de estado en un Work. |
| `session.activated` | `SessionProjector` | Sesión de usuario materializada. |

**La distinción `message.received` / `message.sent` es no negociable.** Usar el mismo evento para ambos crea un loop donde el Cognitive Dispatcher reacciona a sus propias respuestas.

---

### 4.4 Capa de Políticas — PolicyContext

Antes de ejecutar cualquier runtime, FluxCore resuelve un `PolicyContext` leyendo su configuración. El `PolicyContext` contiene **toda** la información que el runtime necesita para decidir. Los runtimes no consultan DB, no llaman a servicios de configuración, no resuelven cuentas. Reciben el mundo ya resuelto.

**Principio de completitud:** Si el runtime necesita un dato para decidir correctamente, ese dato pertenece al `PolicyContext`. Sin excepción.

Esto incluye — sin debate posible — el modo de operación, los delays, el tono, la ventana de turno, y cualquier otro parámetro de comportamiento. Un runtime que llama a `getAccountConfig()` durante `handleMessage` viola la soberanía. Un `PolicyContext` que omite el `mode` obliga al runtime a buscarlo, reproduciendo el error que este diseño cierra.

```typescript
interface FluxPolicyContext {
  // Identidad resuelta (estructural, obligatoria)
  accountId: string;
  contactId: string;
  channel: string;

  // Atención — cómo debe responder
  tone: 'formal' | 'casual' | 'neutral';
  useEmojis: boolean;
  language: string;

  // Automatización — si debe responder y cómo
  mode: 'auto' | 'suggest' | 'off';
  responseDelayMs: number;  // delay intencional antes de responder (UX: "alguien está pensando")

  // Turno conversacional — cuándo responder
  turnWindowMs: number;        // ventana de agregación para mensajes reales
  turnWindowTypingMs: number;  // ventana de extensión por señales de typing/recording (generalmente mayor)
  turnWindowMaxMs: number;     // techo absoluto; el turno cierra aunque sigan llegando señales

  // Reglas de negocio del cliente
  offHoursPolicy: OffHoursPolicy;
  contactRules: ContactRule[];

  // Runtime activo y su configuración
  activeRuntimeId: string;
  assistantInstructions?: string;   // para AsistentesLocal: prompt del asistente
  assistantExternalId?: string;     // para AsistentesOpenAI: ID del assistant remoto

  // Herramientas y plantillas autorizadas para esta cuenta/contacto
  authorizedTools: string[];
  authorizedTemplates: string[];

  // Estado operativo activo (para Fluxi)
  activeWork?: ActiveWorkContext;
  workDefinitions?: WorkDefinition[];
}
```

**El `mode` es el gate de cognición.** Determina si el runtime se ejecuta automáticamente (`auto`), genera una sugerencia para aprobación humana (`suggest`), o no se invoca en absoluto (`off`). El `CognitiveDispatcher` respeta este gate antes de invocar al `RuntimeGateway`. Es una decisión de FluxCore, no del runtime.

**El `responseDelayMs` es distinto del `turnWindowMs`.** La ventana de turno agrega ráfagas; el response delay introduce una pausa intencional *después* de que el turno está cerrado y *antes* de invocar al runtime. Su propósito es de UX: evitar respuestas que llegan en 50ms cuando el usuario percibe que "debería haber alguien pensando". El `CognitionWorker` aplica este delay, no el runtime.

**Resolución permanente de conflictos:** Todo documento que contradiga esta especificación — en particular cualquier guía que afirme que `PolicyContext` no debe contener `mode`, `responseDelayMs`, o estilo — está obsoleto y debe depreciarse. Este Canon es la fuente de verdad.

---

### 4.5 Cognitive Dispatcher

**Ubicación:** Junto al Kernel, no en la capa de Chat.

**Disparador:** El `CognitionWorker` consume `fluxcore_cognition_queue` seleccionando entradas cuya `turn_window_expires_at` ya pasó. Usa `FOR UPDATE SKIP LOCKED`.

Por cada turno listo:
1. Verifica que `IdentityProjector` ya materializó la identidad. Si no está lista, extiende la ventana 500ms y libera el lock.
2. Lee **todos los mensajes del turno** desde `messages` (`created_at >= turn_started_at` para esa `conversation_id`).
3. Construye el `PolicyContext` usando `FluxPolicyContextService`.
4. Obtiene historial conversacional previo desde `messages` (últimos N mensajes anteriores al turno).
5. Invoca al `RuntimeGateway` con el contexto completo.

**Por qué el historial viene de `messages` y no del Journal:** El Journal almacena evidencia física cruda (`evidence_raw`). El runtime necesita representación lingüística (`role: user|assistant`, `content: string`). Reconstruir esa representación desde el Journal equivale a reimplementar el `ChatProjector` en el Dispatcher. El `ChatProjector` ya lo hizo correctamente y de forma atómica.

---

### 4.6 Runtime Gateway

Mantiene un registro de `runtimeId → RuntimeAdapter`. Para una cuenta, consulta la configuración y obtiene el runtime activo. Invoca `runtime.handleMessage(input)` y pasa las acciones resultantes al `ActionExecutor`.

**El runtime activo lo elige el cliente desde configuración administrativa. FluxCore solo respeta esa decisión.**

---

### 4.7 Runtimes (Soberanos)

**Contrato único, compartido por todos los runtimes:**

```typescript
interface RuntimeAdapter {
  readonly runtimeId: string;
  handleMessage(input: RuntimeInput): Promise<ExecutionAction[]>;
}

interface RuntimeInput {
  signal: KernelSignal;              // señal certificada que originó el turno
  policyContext: FluxPolicyContext;  // mundo autorizado completo
  conversationHistory: Message[];    // historial previo + mensajes del turno actual
}
```

**Invariantes de todos los runtimes:**
- No acceden a bases de datos durante `handleMessage`.
- No tienen estado global entre invocaciones.
- No se invocan entre sí. Son alternativas completas.
- No ejecutan herramientas directamente. Devuelven acciones.
- Siempre producen un resultado: respuesta, sugerencia, propuesta, o `no_action` justificado.
- El modo (`auto`/`suggest`/`off`) es una política del `PolicyContext`. El runtime no decide si ejecutarse.

---

#### 4.7.1 Runtime: Asistentes Local (`@fluxcore/asistentes`)

**Naturaleza:** Cognitivo probabilístico, ejecución interna. FluxCore controla el prompt, las llamadas al modelo y el loop de herramientas.

**Flujo de ejecución:**
```
mensaje
  → Resolución del Plan de Ejecución
  → Construcción del Contexto
  → PromptBuilder (PolicyContext + instrucciones del asistente)
  → Llamada al LLM (con fallback entre providers)
  → Tool Loop (máximo 2 rounds)
  → ExecutionAction[]
```

**PromptBuilder:** Combina dos fuentes separadas en secciones distintas del prompt:
1. `PolicyContext`: tono, formalidad, emojis, notas del contacto, modo. **Tiene prioridad** porque es la voz del negocio.
2. Datos del asistente: instrucciones de sistema, directivas de herramientas, historial formateado.

**Fallback entre providers:** Soporta múltiples providers (Groq, OpenAI completions). El orden de prioridad lo define el `ExecutionPlan` en el `PolicyContext`.

**Si el plan de ejecución está bloqueado, no se invoca al LLM.**

**Acciones típicas:** `send_message`, `search_knowledge`, `send_template`, `list_available_templates`.

---

#### 4.7.2 Runtime: Asistentes OpenAI (`@fluxcore/asistentes-openai`)

**Naturaleza:** Cognitivo probabilístico, ejecución remota. FluxCore actúa como puente hacia OpenAI Assistants API.

**Flujo de ejecución:**
```
mensaje
  → Resolución del Plan de Ejecución (externalId presente)
  → Construcción del historial como thread de OpenAI
  → Inyección de PolicyContext e instrucciones como override
  → runAssistantWithMessages() → thread + run
  → Espera de respuesta (polling del run)
  → ExecutionAction[]
```

**Diferencias clave respecto a Asistentes Local:**

| Aspecto | Local | OpenAI |
|---|---|---|
| Quién ejecuta el LLM | FluxCore (vía completions API) | OpenAI (vía Assistants API) |
| Quién gestiona tools | ToolRegistry de FluxCore | OpenAI (file_search, code_interpreter) |
| Quién gestiona vector stores | FluxCore (RAG propio) | OpenAI (vector stores remotos) |
| Control del prompt | Total (PromptBuilder) | Parcial (override de instructions) |

**Asistentes Local y Asistentes OpenAI no son sub-modos del mismo runtime. Son implementaciones paralelas e independientes. Nunca se invocan entre sí ni como fallback.**

---

#### 4.7.3 Runtime: Fluxi / WES (`@fluxcore/fluxi`)

**Naturaleza:** Transaccional determinista. Implementa el mismo contrato `RuntimeAdapter`.

**Misión:** Resolver operaciones de negocio donde la conversación no es suficiente. Cuando un usuario dice "quiero agendar un turno", eso es una transacción con múltiples pasos, datos a confirmar y un efecto real en un sistema externo. Fluxi convierte esa frase en un **Work**: estructura auditurable que avanza paso a paso.

**Flujo interno de Fluxi:**

**Fase 1 — ¿Existe un Work activo?**
Si hay Work en progreso para la conversación, el mensaje se entrega al Work Engine como input de continuación. No se buscan nuevas intenciones.

**Fase 2 — Interpretación (si no hay Work activo)**
Se invoca al WES Interpreter: componente cognitivo especializado que analiza el mensaje buscando una intención transaccional. Recibe el texto y las `WorkDefinitions` activas. Devuelve un `ProposedWork` con `candidateSlots` y `evidence` textual, o `null`. Si devuelve `null`, Fluxi produce `send_message` indicando que no detectó intención operativa. Nunca cae al runtime de Asistentes.

**Fase 3 — Gate de Apertura (determinista)**
El `ProposedWork` debe superar: la `WorkDefinition` referida existe y la cuenta tiene permiso; existe al menos un `bindingAttribute` con `evidence` no vacía; no hay conflicto de concurrencia con Works existentes. Si el gate rechaza, el ProposedWork se registra como descartado.

**Fase 4 — Ejecución del Work (FSM)**

| Estado | Significado |
|---|---|
| `CREATED` | Work instanciado, slots iniciales persistidos. |
| `ACTIVE` | Esperando mensajes para completar slots. |
| `WAITING_USER` | Fluxi preguntó algo y espera respuesta. |
| `WAITING_CONFIRMATION` | SemanticContext emitido, espera confirmación. |
| `EXECUTING` | Claim adquirido, invocando herramienta. |
| `COMPLETED` | Trabajo finalizado con éxito. |
| `FAILED` | Error no recuperable. |
| `EXPIRED` | TTL vencido sin completar. |

**Fase 5 — Confirmación Semántica**
Cuando un slot es ambiguo, Fluxi genera un `SemanticContext` (UUID único) y envía al usuario una pregunta clara. Cuando el usuario confirma: se resuelve contra el `SemanticContext` pendiente sin LLM. Se registra un `SemanticCommit`. Un `SemanticContext` solo puede consumirse una vez.

**Fase 6 — Efectos Externos (exactly-once)**
Antes de invocar cualquier herramienta irreversible: se adquiere un `ExternalEffectClaim` (clave `accountId + semanticContextId + effectType`). Si el claim falla (ya existe), se aborta. Si tiene éxito, se invoca la herramienta con `idempotencyKey`. Se registra el `ExternalEffect` con su resultado.

**Entidades del dominio de Fluxi:**

| Entidad | Propósito |
|---|---|
| `Work` | Unidad transaccional con ciclo de vida (FSM), slots tipados y eventos auditables. |
| `ProposedWork` | Hipótesis transaccional. No hay Work sin ProposedWork previo persistido. |
| `Slot` | Variable de estado: `path`, `type`, `value`, `source`, `evidence`, `set_by`, `set_at`. |
| `WorkDefinition` | Contrato: slots requeridos, FSM, políticas de expiración, `bindingAttribute`, efectos externos. |
| `SemanticContext` | Puente entre una pregunta del sistema y la respuesta futura del usuario. |
| `ExternalEffectClaim` | Lock causal de un solo uso. Garantiza exactly-once. |
| `WorkEvent` | Registro inmutable append-only de todo lo que ocurre en un Work. |
| `DecisionEvent` | Registro de cada decisión cognitiva (invocación al Interpreter). |

**Tablas de Fluxi:** `fluxcore_work_definitions`, `fluxcore_works`, `fluxcore_work_slots`, `fluxcore_work_events`, `fluxcore_proposed_works`, `fluxcore_decision_events`, `fluxcore_semantic_contexts`, `fluxcore_external_effect_claims`, `fluxcore_external_effects`.

**Acciones típicas de Fluxi:** `propose_work`, `open_work`, `advance_work_state`, `request_slot`, `send_message`, `close_work`.

**Invariantes de Fluxi:**
1. Fluxi nunca llama al runtime de Asistentes.
2. No hay Work sin ProposedWork persistido previo.
3. No hay efecto externo sin `ExternalEffectClaim` adquirido.
4. La IA solo propone; el Work Engine (determinista) dispone.
5. Las confirmaciones se resuelven contra `SemanticContext`, nunca con LLM.
6. Todo cambio de estado genera un `WorkEvent` inmutable.
7. Un `SemanticContext` solo puede consumirse una vez.

---

### 4.8 Herramientas — Modelo de Registro y Mediación

Las herramientas no pertenecen ni a FluxCore ni a los runtimes. Son puentes hacia sistemas que pueden vivir en cualquier capa (ChatCore, FluxCore, sistemas externos).

**FluxCore mantiene el registro de todas las herramientas disponibles y media el acceso** (valida permisos contra el `PolicyContext`, aplica políticas). El runtime declara la intención de usar una herramienta devolviendo una acción. El `ActionExecutor` la ejecuta.

**Test ontológico para herramientas:**

| Herramienta | Implementación | ¿Existiría sin IA? |
|---|---|---|
| `search_knowledge` | Servicio RAG de FluxCore | No → FluxCore |
| `send_template` | Servicio de plantillas | Sí → ChatCore |
| `list_available_templates` | Lectura de `templates` | Sí → ChatCore |
| `get_contact_notes` | Lectura de `contacts` | Sí → ChatCore |
| `create_appointment` | Sistema externo de agenda | Sí → Dominio externo |

ChatCore expone sus capacidades como servicios (no como acceso directo a tablas). FluxCore los envuelve como adaptadores de herramienta. **ChatCore no sabe que existe la IA.** El servicio de plantillas de ChatCore no cambia; FluxCore simplemente tiene un adaptador que lo llama cuando un runtime devuelve `send_template`.

Desde la perspectiva del runtime, todas las herramientas son idénticas. No sabe, ni le importa, la implementación subyacente.

---

### 4.9 Action Executor

Ejecuta las acciones devueltas por los runtimes. Es el **único componente autorizado a producir efectos en el mundo**.

**Responsabilidades:**
- Validar que la acción esté autorizada (contra `PolicyContext.authorizedTools`).
- Ejecutar el efecto correspondiente.
- Registrar log de auditoría por cada acción.
- Emitir eventos de dominio post-ejecución cuando corresponda.
- Marcar `fluxcore_cognition_queue.processed_at` al completar sin error.

**Acciones soportadas (extensibles):**

| Acción | Efecto |
|---|---|
| `send_message` | Inserta en `messages` con estado `pending`. Emite `message.sent`. Worker de canal lo enviará. |
| `send_template` | Similar a `send_message`, usando servicio de plantillas autorizado. |
| `propose_work` | Crea registro en `fluxcore_proposed_works`. |
| `open_work` | Instancia Work desde ProposedWork. Requiere ProposedWork previo. |
| `advance_work_state` | Transición de estado en Work activo. Valida que la transición sea válida en la FSM. |
| `request_slot` | Genera `SemanticContext` y mensaje de solicitud al usuario. |
| `close_work` | Cierra Work con estado `COMPLETED` o `FAILED`. |
| `search_knowledge` | Invoca servicio RAG. Resultado disponible en la misma invocación (v8.2) o mediante re-invocación asíncrona (v8.3). |
| `no_action` | Registra que el runtime procesó el turno sin producir efectos. |

---

### 4.10 ChatCore (Tablas derivadas)

Tablas escritas exclusivamente por proyectores. No contienen lógica de negocio. No saben que existe la IA.

**Tablas principales:** `messages`, `conversations`, `accounts`, `relationships`, `templates`, `contacts`.

---

### 4.11 UI / API

Consultan tablas derivadas para mostrar datos. Envían comandos de usuario que se convierten en señales vía Reality Adapters. Sin lógica de negocio. La UI existente se reutiliza sin cambios estructurales.

---

## 5. Flujo Completo de un Mensaje Humano

### Paso 1 — Ingesta
Un mensaje llega por WhatsApp. El `WhatsAppGateway` lo normaliza a `EXTERNAL_INPUT_OBSERVED`, firma la señal y llama a `kernel.ingestSignal()`. El Kernel persiste en `fluxcore_signals` y escribe en `fluxcore_outbox` en la misma transacción.

### Paso 2 — Proyección estructural
El `IdentityProjector` se despierta. Resuelve `accountId` y `contactId` desde el número de teléfono. Actualiza tablas de identidad. Todo en una transacción atómica con su cursor.

### Paso 3 — Proyección conversacional y encolado
El `ChatProjector` se despierta. Dentro de una transacción atómica:
1. Inserta en `messages` con `ON CONFLICT (signal_id) DO NOTHING`.
2. Actualiza `conversations`.
3. Escribe en `fluxcore_cognition_queue` con upsert: si hay turno pendiente para esa `conversation_id`, extiende `turn_window_expires_at`; si no, crea entrada nueva.
4. Actualiza su cursor.

Post-transacción: emite `message.received` al Event Bus (UI se actualiza vía WebSocket).

### Paso 4 — Cierre de turno
El `CognitionWorker` consulta `fluxcore_cognition_queue WHERE turn_window_expires_at < now()`. Mientras la ventana no venza, señales adicionales del mismo usuario extienden el turno. Al vencer, el worker toma la entrada.

### Paso 5 — Cognición
El worker verifica identidad materializada. Lee todos los mensajes del turno desde `messages`. Construye `PolicyContext`. Obtiene historial previo. Invoca al `RuntimeGateway`.

### Paso 6 — Decisión del runtime
`RuntimeGateway` determina el runtime activo y llama a `runtime.handleMessage(input)`. El runtime procesa con contexto completo y devuelve `ExecutionAction[]`.

### Paso 7 — Ejecución
`ActionExecutor` valida y ejecuta cada acción. Para `send_message`: inserta en `messages` con estado `pending`, emite `message.sent`. Marca `processed_at` en la cola.

### Paso 8 — Entrega al canal
Worker dedicado toma mensajes `pending` y los envía al canal real. Al confirmar envío: estado → `sent`. Si el canal confirma entrega: el Reality Adapter ingresa `DELIVERY_SIGNAL_OBSERVED`, el `ChatProjector` actualiza estado → `delivered`.

---

## 6. Manejo de Herramientas con Resultado

### v8.2 — Servicios inyectados síncronos (vigente)

Los runtimes que necesitan el resultado de una herramienta para continuar (ej. `search_knowledge` para construir el prompt del LLM) reciben el servicio inyectado y lo llaman durante `handleMessage`. El servicio no accede a DB arbitrariamente; usa solo el contexto recibido.

```typescript
class AsistentesLocalRuntime implements RuntimeAdapter {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly knowledgeService: KnowledgeService, // no accede a DB directo
  ) {}

  async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
    const knowledge = await this.knowledgeService.search(query, input.policyContext);
    // construye prompt con knowledge, llama al LLM, devuelve acciones
  }
}
```

### v8.3 — Re-invocación asíncrona (deuda técnica planificada)

El runtime devuelve una acción `search_knowledge` con un `requestId`. El `ActionExecutor` ejecuta la búsqueda y emite `tool.result`. El `CognitionWorker` re-invoca al runtime con el resultado y un `continuationToken`. No requiere cambiar el contrato `RuntimeAdapter`.

---

## 7. Coexistencia y Migración

El sistema actual sigue funcionando mientras los nuevos componentes se construyen en paralelo. El routing se controla por feature flag por cuenta en `extension_installations.config`:

```typescript
{ "useNewArchitecture": boolean }
```

- `false` → proyectores legacy → MessageCore → ExtensionHost.
- `true` → nuevos proyectores → CognitionQueue → Cognitive Dispatcher → nuevos runtimes.

**Nunca mezclar ambos caminos para la misma cuenta.**

### Fases de implementación

**Fase 1 — Proyectores atómicos:** Reescribir `ChatProjector` e `IdentityProjector`. Atómicos, con `fluxcore_cognition_queue` y constraint `UNIQUE (signal_id)`. Sin activar el nuevo flujo.

**Fase 2 — Infraestructura de cognición:** Implementar `fluxcore_cognition_queue`, `CognitionWorker`, `Cognitive Dispatcher`, `RuntimeGateway`, `ActionExecutor`. Sin activar runtimes nuevos.

**Fase 3 — Runtimes:** Reescribir `AsistentesLocal` como `RuntimeAdapter`. Luego Fluxi. Luego AsistentesOpenAI.

**Fase 4 — Activación:** Habilitar `useNewArchitecture = true` para cuentas internas. Monitorear. Luego porcentaje pequeño. Luego todas.

**Fase 5 — Eliminación:** Desactivar y eliminar ExtensionHost, MessageCore legacy y proyectores viejos.

---

## 8. Invariantes del Sistema

Las siguientes propiedades deben ser verdaderas en todo momento. Si alguna se viola, es un bug crítico.

1. `fluxcore_signals` es append-only. Ningún `UPDATE` o `DELETE` es posible (garantizado por triggers de DB).
2. Todo proyector actualiza su cursor en la misma transacción en que escribe en tablas derivadas.
3. La tabla `messages` tiene `UNIQUE (signal_id)`. Toda inserción usa `ON CONFLICT DO NOTHING`.
4. `fluxcore_cognition_queue` se escribe dentro de la transacción del `ChatProjector`. Nunca después.
5. Existe máximo una entrada pendiente por `conversation_id` en `fluxcore_cognition_queue`.
6. El `CognitionWorker` no procesa un turno hasta que `turn_window_expires_at < now()`.
7. Las señales `EXTERNAL_STATE_OBSERVED` (typing, recording) extienden la ventana del turno pero **no crean registros en `messages`** y **no actualizan `last_signal_seq`**.
8. El `CognitionWorker` nunca interpreta el tipo de señal. Solo consume entradas cuya ventana venció.
9. Ningún runtime accede a bases de datos durante `handleMessage`.
10. Los runtimes no se invocan entre sí.
11. `ActionExecutor` es el único componente que produce efectos en el mundo.
12. `message.received` solo lo emite el `ChatProjector` (mensajes entrantes humanos).
13. `message.sent` solo lo emite el `ActionExecutor` (mensajes salientes del sistema).
14. No existe `ExternalEffectClaim` sin `ProposedWork` previo.
15. Un `SemanticContext` solo puede consumirse una vez.
16. Solo adapters clase `SENSOR` o `GATEWAY` pueden invocar `kernel.ingestSignal()`.

---

## 9. Reglas Inviolables del Sistema

1. ChatCore nunca ejecuta lógica de negocio.
2. ChatCore nunca sabe que existe la IA.
3. FluxCore nunca contiene la operación real del cliente.
4. Los runtimes nunca se invocan entre sí.
5. El cliente decide qué runtime responde. FluxCore solo respeta esa decisión.
6. Toda acción irreversible de Fluxi requiere evidencia textual y `ExternalEffectClaim`.
7. Las políticas de atención pertenecen a FluxCore, no a ChatCore.
8. Las herramientas son registradas y mediadas por FluxCore. La decisión de invocarlas es del runtime.
9. Un runtime recibe un turno y siempre produce un resultado (respuesta, sugerencia o `no_action` justificado).
10. Los datos de configuración de FluxCore se persisten vía Configuration Slots de ChatCore, pero ChatCore no los interpreta.
11. Los `INTERPRETER` (IA) jamás escriben en el Kernel.
12. El Kernel no puede ser modificado. Solo puede ser extendido con nuevos adapters y proyectores.

---

## 10. Riesgos y Mitigaciones

| Riesgo | Severidad | Mitigación |
|---|---|---|
| ChatProjector proyecta antes que IdentityProjector | Alta | CognitionWorker verifica identidad materializada antes de disparar; extiende ventana 500ms con backoff si no está lista |
| at-least-once delivery procesa turno dos veces | Alta | `UNIQUE (signal_id)` en `messages`; segundo procesamiento hace `ON CONFLICT DO NOTHING` |
| Turno nunca cierra (usuario escribe continuamente) | Media | `turnWindowMaxMs` como techo absoluto configurable. Pasado ese límite, turno se cierra aunque lleguen señales |
| Latencia percibida como lentitud | Media | `turnWindowMs` configurable por canal. Web chat puede usar 0-500ms |
| Worker de canal falla al enviar mensaje | Media | Estado `pending` en `messages`; worker reintenta con backoff exponencial |
| Fluxi devuelve acción inválida para el estado del Work | Media | ActionExecutor valida la transición en la FSM antes de ejecutar |
| Migración introduce inconsistencias | Media | Feature flags por cuenta; nunca mezclar caminos para la misma cuenta |

---

## 11. Deuda Técnica Explícita

**Re-invocación asíncrona para tools con resultado (v8.3):** La versión actual usa servicios inyectados síncronos. El mecanismo de `continuationToken` y re-invocación se implementa cuando los runtimes estén estables.

**RuntimeRouter para múltiples runtimes por cuenta (futuro):** El diseño actual asume un único runtime activo por cuenta. El routing por tipo de mensaje (Fluxi para transaccionales, Asistentes para el resto) requiere un `RuntimeRouter` no especificado aquí.

---

## 12. Comparación con el Diseño Anterior

| Aspecto | v7.x (anterior) | v8.2 (este documento) |
|---|---|---|
| Disparador cognitivo | `core:message_received` (frágil, perdible) | `fluxcore_cognition_queue` (transaccional, garantizado) |
| Unidad de decisión | Señal individual → una ejecución por mensaje | Turno conversacional → una ejecución por ráfaga |
| Ráfagas de mensajes | N mensajes → N respuestas redundantes | N mensajes → 1 respuesta al cierre del turno |
| Proyectores | No atómicos, llamaban a MessageCore | Atómicos, puros, cursor en la misma tx |
| Idempotencia | Sin garantías | `UNIQUE (signal_id)` con `ON CONFLICT DO NOTHING` |
| Runtimes | Accedían a DB, ExtensionHost los orquestaba | Soberanos, sin DB, contrato único |
| Fluxi | Extensión con acceso directo a DB | Runtime con mismo contrato, acciones declarativas |
| Herramientas | Ejecutadas directamente por runtime | Mediadas por ActionExecutor con validación |
| ChatCore | Contenía lógica (MessageCore) | Solo tablas derivadas |
| Pérdida de señales | Posible si proceso muere | Imposible: cognition_queue dentro de la tx |
| Reconstruibilidad | Imposible por efectos laterales | Total, garantizada por proyectores puros |

---

## Conclusión

Este diseño resuelve los problemas fundamentales del sistema anterior y establece una base sobre la que vale la pena programar:

La cognición no se pierde aunque el proceso muera. Los mensajes no se duplican en replay. Las ráfagas producen una única decisión. Fluxi es un decisor soberano, no un motor BPM embebido. El historial para el LLM viene de la representación lingüística correcta. Los eventos de entrada y salida son semánticamente distintos.

**La implementación comienza por la Fase 1: proyectores atómicos con cola de cognición y turn-window.**