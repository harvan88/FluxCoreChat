# FluxCore v8.2 — Mapa Arquitectónico

> Última actualización: 2026-02-18
> Este documento es el mapa visual de la arquitectura v8.2

---

## 1. Anatomía del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MUNDO EXTERNO                                  │
│   WhatsApp · Web · Telegram · Email                                 │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    CHATCORE (CUERPO)                                  │
│                                                                      │
│   ┌───────────────┐    ┌──────────────┐    ┌───────────────────┐    │
│   │  WA Adapter   │    │  Web Adapter │    │  Telegram Adapter │    │
│   └───────┬───────┘    └──────┬───────┘    └────────┬──────────┘    │
│           │                   │                      │               │
│           └───────────────────┼──────────────────────┘               │
│                               │                                      │
│                               ▼                                      │
│                   ┌───────────────────────┐                          │
│                   │  RealityAdapter       │  (Normaliza → Señal)     │
│                   └───────────┬───────────┘                          │
│                               │                                      │
│  ┌─────────────────┐          │          ┌─────────────────────┐    │
│  │   messages       │         │          │   conversations     │    │
│  │   (signal_id UQ) │         │          │                     │    │
│  └─────────────────┘          │          └─────────────────────┘    │
│                               │                                      │
│  ┌─────────────────┐          │          ┌─────────────────────┐    │
│  │   relationships  │         │          │   WebSocket / Events│    │
│  └─────────────────┘          │          └─────────────────────┘    │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         KERNEL (COLUMNA VERTEBRAL)                    │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │                  fluxcore_signals (Journal)                   │    │
│   │  IMMUTABLE · APPEND-ONLY · ORDERED                           │    │
│   │  Trigger: prevent_signal_mutation()                          │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│   kernel.ingestSignal() → verify → certify → append → wakeup        │
│                                      │                                │
│                                      ▼                                │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │              PROJECTOR PIPELINE (Atómico)                    │    │
│   │                                                               │    │
│   │  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │    │
│   │  │IdentityProjector│→│ChatProjector  │→│SessionProjector│ │    │
│   │  │(resolve actors) │  │(msg + queue)  │  │(sessions)      │ │    │
│   │  └─────────────────┘  └──────────────┘  └────────────────┘ │    │
│   │                                                               │    │
│   │  Invariante: cursor se actualiza en la MISMA transacción     │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                                │
                     ChatProjector escribe
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     COGNITION QUEUE (COLA)                             │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │              fluxcore_cognition_queue                         │    │
│   │                                                               │    │
│   │  conversation_id  │  last_signal_seq  │ turn_window_expires  │    │
│   │  ─────────────────┼───────────────────┼──────────────────── │    │
│   │  uuid-abc-123     │  42               │ 2026-02-18 10:52:03 │    │
│   │  uuid-def-456     │  45               │ 2026-02-18 10:52:08 │    │
│   │                                                               │    │
│   │  Partial UNIQUE: (conversation_id) WHERE processed_at IS NULL│    │
│   │  FK: last_signal_seq → fluxcore_signals.sequence_number      │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│   📨 Mensaje nuevo    → INSERT (window = 3s)                         │
│   📨 Mensaje ráfaga   → ON CONFLICT DO UPDATE (window renewed)       │
│   ⌨️  Typing humano   → UPDATE turnWindowExpiresAt + 5s              │
│   ⏱️  Silencio        → CognitionWorker recoge el turno              │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                     turn_window_expires_at < NOW()
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     FLUXCORE (CEREBRO)                                 │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  CognitionWorker (Heartbeat)                                 │    │
│   │  Poll: 1s · FOR UPDATE SKIP LOCKED · Max 3 attempts         │    │
│   └───────────────────────┬─────────────────────────────────────┘    │
│                           │                                           │
│                           ▼                                           │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  CognitiveDispatcher (Router Puro)                           │    │
│   │                                                               │    │
│   │  1. Resolve PolicyContext                                    │    │
│   │  2. Check automation mode (auto/suggest/off)                 │    │
│   │  3. Start typing keepalive ⌨️                                │    │
│   │  4. Build RuntimeInput                                       │    │
│   │  5. Invoke RuntimeGateway                                    │    │
│   │  6. Stop typing keepalive                                    │    │
│   │  7. Pass actions → ActionExecutor                            │    │
│   └───────────┬─────────────────────────────┬───────────────────┘    │
│               │                             │                         │
│               ▼                             ▼                         │
│   ┌───────────────────────┐   ┌─────────────────────────────┐       │
│   │  PolicyContextService │   │  RuntimeGateway              │       │
│   │  (Pre-resolved data)  │   │  ┌──────────────────────┐   │       │
│   │                       │   │  │ AsistentesLocalRuntime│   │       │
│   │  · attention (tone)   │   │  │ (handleTurn)          │   │       │
│   │  · contact (notes)    │   │  └──────────────────────┘   │       │
│   │  · business (bio)     │   │  ┌──────────────────────┐   │       │
│   │  · knowledge (web)    │   │  │ FutureRuntime-B      │   │       │
│   │  · commercial ($)     │   │  │ (handleTurn)          │   │       │
│   │  · presence (hours)   │   │  └──────────────────────┘   │       │
│   │  · resources (tools)  │   │  Timeout: 30s               │       │
│   └───────────────────────┘   └─────────────────────────────┘       │
│                                             │                         │
│                                             │ ExecutionAction[]       │
│                                             ▼                         │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  ActionExecutor (Mediador Brain→Body)                        │    │
│   │                                                               │    │
│   │  send_message → messages INSERT + WS event                   │    │
│   │  send_template → templateService (TODO H3)                   │    │
│   │  start_typing → WS typing indicator                          │    │
│   │  no_action → log only                                        │    │
│   │                                                               │    │
│   │  Invariante: todo efecto pasa por ChatCore                   │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Flujo de un Mensaje (End-to-End)

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: INGESTA                                                  │
│                                                                  │
│  WhatsApp msg "Hola, quiero saber los aranceles"                │
│       │                                                          │
│       ▼                                                          │
│  WA Driver → NormalizedMessage                                   │
│       │                                                          │
│       ▼                                                          │
│  RealityAdapter.processExternalObservation()                     │
│       │  factType: EXTERNAL_INPUT_OBSERVED                       │
│       │  subject: whatsapp/user/5491155556789                    │
│       │  evidence: { raw: normalizedMessage }                    │
│       ▼                                                          │
│  Kernel.ingestSignal() → Sequence #42                            │
│       │                                                          │
│       ▼                                                          │
│  WAKEUP → Projector Pipeline (Atomic Transaction)                │
│       │                                                          │
│       ├─ IdentityProjector: resolve actor + address              │
│       ├─ ChatProjector:                                          │
│       │   ├─ resolve relationship                                │
│       │   ├─ create conversation (if new)                        │
│       │   ├─ INSERT message (ON CONFLICT signal_id DO NOTHING)   │
│       │   └─ UPSERT cognition_queue (window = 3s)               │
│       └─ SessionProjector: update session                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                    ... 3 seconds of silence ...
                           │
┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: COGNICIÓN                                                │
│                                                                  │
│  CognitionWorker poll → finds expired window                     │
│       │                                                          │
│       ▼                                                          │
│  CognitiveDispatcher.dispatch()                                  │
│       │                                                          │
│       ├─ PolicyContext resolved (tone, knowledge, etc)            │
│       ├─ Typing keepalive started ⌨️  (pulses every 3s)          │
│       ├─ AsistentesLocalRuntime.handleTurn()                     │
│       │   └─ LLM call with full context                          │
│       ├─ Typing keepalive stopped                                │
│       └─ ActionExecutor.execute()                                │
│           ├─ INSERT message (type: outgoing, generatedBy: ai)    │
│           └─ Emit WebSocket event                                │
│                                                                  │
│  Usuario ve: "Escribiendo..." → respuesta                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Flujo del Typing (Bidireccional)

### Typing del Humano ← Extiende Turn-Window
```
Humano teclea → WA/Web adapter → Kernel (EXTERNAL_STATE_OBSERVED)
  → ChatProjector.projectStateChange()
  → Find pending cognition entry
  → UPDATE turn_window_expires_at += 5s
  → La IA espera más tiempo
```

### Typing de la IA → Anuncio al Humano
```
CognitionWorker despierta
  → CognitiveDispatcher.startTypingKeepAlive()
    → ActionExecutor({type: 'start_typing'})
      → ChatCore emite evento WS
        → WA/Web adapter envía "escribiendo..."
    → Cada 3s: otro pulso (para WA que tiene timeout 25s)
  → Runtime produce respuesta
  → typingKeepAlive.stop()
  → ActionExecutor({type: 'send_message', content: '...'})
```

---

## 4. Inventario de Archivos v8.2

### Kernel (Congelado)
```
apps/api/src/core/kernel/
├── kernel.ts              ← RFC-0001, inmutable
├── base.projector.ts      ← Transaccional, cursor atómico
apps/api/src/core/projections/
├── chat-projector.ts      ← v8.2: msg + queue + typing
├── identity-projector.ts  ← Puro, atómico
└── session-projector.ts   ← Sessions
```

### FluxCore (Cerebro)
```
apps/api/src/core/
├── fluxcore-types.ts       ← ExecutionAction, RuntimeAdapter, RuntimeInput
├── events.ts               ← cognition:turn_processed, turn_failed

apps/api/src/services/fluxcore/
├── runtime-gateway.service.ts         ← Registro + invocación
├── cognitive-dispatcher.service.ts    ← Router + typing keepalive
├── action-executor.service.ts         ← Brain→Body mediator
├── reality-adapter.service.ts         ← External→Kernel gateway

apps/api/src/workers/
├── cognition-worker.ts    ← Heartbeat (1s poll)
```

### Esquema DB
```
packages/db/src/schema/
├── fluxcore-journal.ts     ← fluxcoreSignals (Kernel Journal)
├── fluxcore-cognition.ts   ← fluxcoreCognitionQueue (Turn-Window)
├── fluxcore-identity.ts    ← Actors, Addresses, Links
├── messages.ts             ← signal_id UNIQUE
```

### Documentación
```
docs/fluxcore/
├── FLUXCORE_V8_IMPLEMENTATION_PLAN.md   ← Plan maestro con checkmarks
├── PROGRESS_LOG.md                       ← Este changelog
├── ARCHITECTURE_MAP.md                   ← Este mapa (visual)
├── AUDIT_KERNEL_PROJECTORS.md
├── AUDIT_DATABASE_SCHEMA.md
├── AUDIT_RUNTIMES.md
├── AUDIT_FRONTEND.md
├── AUDIT_SERVICES_TOOLS.md
└── MIGRATION_STRATEGY.md
```

---

## 5. Traza Activa — Login vía Kernel

> **Estado:** 🟢 IMPLEMENTADO (Feb 2026). La UI consume el estado soberano de sesiones proyectado por el Kernel.

1. **Ingreso de señal**
   - `Identity.LoginRequested` (`fact_type = EXTERNAL_INPUT_OBSERVED`): un adapter de UI certifica que un humano envió credenciales/magic link.
   - Payload mínimo (`evidence_raw`): `{ accountPerspective, identifier, method, deviceHash }`.
2. **Verificación**
   - `IdentityProjector` valida identidad física y, si procede, emite `Identity.LoginSucceeded` (mismo fact type, distinta evidencia) con `{ accountId, actorId, scopes }`.
   - Fallos generan `Identity.SessionInvalidated` (`fact_type = EXTERNAL_STATE_OBSERVED`).
3. **Projector de Sesiones**
   - Lee las señales anteriores, mantiene `fluxcore_session_projection` (cursor por actorId) con campos: `sessionId`, `accountId`, `scopes`, `status`, `lastSeenAt`, `deviceHash`.
   - Cada wake-up sincroniza la tabla/stream consumida por la UI.
4. **Exposición a la UI**
   - El servidor HTTP ya expone `GET /kernel/sessions/active` (ver `apps/api/src/routes/kernel-sessions.routes.ts`). Filtra por `accountId/actorId/status` y devuelve la proyección soberana ordenada por `updated_at DESC`. También se puede publicar via WebSocket (`kernel:sessions.updated`) una vez que exista el stream.
5. **Consumo en frontend**
   - `useKernelSessions` + `KernelSessionsSection` (`apps/web/src/hooks/useKernelSessions.ts` y `apps/web/src/components/settings/KernelSessionsSection.tsx`) consultan periódicamente el endpoint, escuchan `kernel:session_updated` y muestran las sesiones activas/pending en Settings → Kernel. La UI deja de depender de estado local: basta refrescar la proyección para continuar tras reinicios.

_Última actualización: alineada con `c:\Users\harva\.windsurf\plans\fluxcore-runtime-login-plan-63d8df.md`._
