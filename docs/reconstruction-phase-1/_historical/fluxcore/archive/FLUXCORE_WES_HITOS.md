 # FluxCore — Hitos de Implementación (WOS/WES)

**Normativa:** Este documento define hitos ejecutables con criterios verificables.

**Inmutables:**
- `TOTEM.md` (principios) — no se edita.
- `3. CREACION DE HITOS.md` (metodología HCI) — no se edita.

**Gate de migraciones:** Todo hito que toque DB MUST cumplir `6. MIGRATIONS_REASONING_PROTOCOL.md` (DB viva + schema ORM + journal).

---

## Nota canónica (decisión vs ejecución)

- MUST: FluxCore es un **WOS** (sistema operativo de trabajo); el **WES** es su motor transaccional.
- MUST: El WES **no decide**. El WES verifica/commitea/ejecuta.
- MAY: El sistema cognitivo (Agents/IA) decide (no determinista) cuando **no hay Work operativo activo**.
- MUST: Existe **Modo Conversacional** fuera del WES cuando un mensaje no puede representarse como Work.
- MUST: Un usuario **no “conversa”** con FluxCore; el usuario **completa una estructura de datos (Work/slots)** vía lenguaje natural.

---

## HCI aplicado (resumen operativo)
Cada hito incluye:
- **Diagnóstico** (evidencia)
- **Definición** (qué se construye)
- **Transición** (cambios concretos por archivo / DB)
- **Validación** (tests/build/queries)
- **Documentación** (qué doc se actualiza / crea)

---

## WOS-100 — Enrutamiento canónico: Work vs Modo Conversacional

### Diagnóstico (evidencia)
- La arquitectura requiere distinguir entre:
  - mensajes que continúan un Work activo,
  - mensajes que abren un Work,
  - mensajes que no se convierten en Work.

### Definición
- MUST: Dado `message + context(accountId, relationshipId, conversationId)`:
  1) Si existe Work activo: enrutar al WES (`ingestMessage`).
  2) Si no existe Work activo: Agents evalúan `¿puede convertirse en Work?`.
     - Si sí: abrir Work.
     - Si no: entrar a Modo Conversacional (fuera del WES).

- MUST: Si no hay Work activo y se evalúa cognición:
  - persistir `DecisionEvent` (aunque el resultado sea “modo conversacional”), y
  - si existe hipótesis transaccional, persistir `ProposedWork` antes de cualquier apertura.

- MUST: La apertura de Work pasa por un Gate determinista:
  - intención transaccional + al menos un `bindingAttribute` con `evidence` no vacía.
  - si falta `bindingAttribute` o su evidencia: preguntar; no abrir Work.

- MUST: Por defecto, una conversación tiene **a lo sumo 1 Work activo**.
- MUST: Si existieran múltiples Works candidatos (solo permitido si hay concurrencia controlada declarada), el sistema MUST desambiguar:
  - por regla declarada (WorkDefinition), o
  - preguntando explícitamente al usuario.

### Transición (código)
- Definir contract explícito del router (interfaces y resultados), sin mezclar decisión dentro del WES.

- Definir un `WorkResolver` (servicio/interfaz) responsable de:
  - obtener el Work activo por `(accountId, relationshipId, conversationId)`
  - aplicar la regla de unicidad/desambiguación

### Validación
- Tests mínimos:
  - caso Work activo ⇒ no se llama a Agents para decidir Work
  - caso sin Work y sin intención operativa ⇒ cae a Modo Conversacional

- Tests de ambigüedad:
  - dos Works activos (caso inválido por defecto) ⇒ el sistema no adivina; exige desambiguación o rechaza

### Documentación
- Referenciar `docs/FLUXCORE_WES_CANON.md` sección “Enrutamiento canónico”.

---

## WES-110 — Separación: “IA automation” ≠ “Extension processing”

### Diagnóstico (evidencia)
- Existe pipeline Core → `extensionHost.processMessage(...)`.
- El modo de automatización (auto/suggest/off) se evalúa en `apps/api/src/services/automation-controller.service.ts`.
- Riesgo actual: un gating global puede impedir extensiones no‑IA (dominio) aunque IA esté en `off`.

### Definición
- MUST: Extensiones de dominio (no‑IA) deben poder procesar mensajes aunque IA esté desactivada.
- MUST: `automationMode` debe afectar solo:
  - generación IA automática,
  - suggestions,
  - acciones IA.

### Transición (código)
- Archivo ancla: `apps/api/src/core/message-core.ts`.
- Introducir una distinción explícita (sin inferencias):
  - **Paso A:** siempre llamar a `extensionHost.processMessage(...)` para extensiones habilitadas.
  - **Paso B:** la automatización IA se ejecuta condicionalmente según `automationMode`.
- MUST: preservar permisos/ContextAccess (no bypass).

### Validación
- Unit test / integration test (mínimo):
  - Con automation `off`, una extensión de dominio sigue recibiendo el evento de mensaje.
- No regresión:
  - `bun run build` (repo) (ver `QUICK_START.md`).

### Documentación
- Registrar el contrato de `automationMode` como señal, no como “kill switch” global.

---

## WES-120 — Contrato de pipeline para extensiones (handled/stopPropagation)

### Diagnóstico
- El WES requerirá, cuando exista Work activo, poder “tomar” el mensaje y evitar que otras extensiones lo procesen en paralelo, salvo que se permita.

### Definición
- Añadir un resultado canónico de `onMessage`:
  - `handled: boolean`
  - `stopPropagation: boolean`
  - `events: DomainEvent[]` (opcional)

### Transición
- `apps/api/src/services/extension-host.service.ts`:
  - recolectar resultados en orden determinista
  - si `stopPropagation` es true: detener el pipeline

### Validación
- Test: dos extensiones instaladas; la primera retorna `stopPropagation`; la segunda NO es invocada.

---

## WES-175 — Compatibilidad segura del pipeline de extensiones

### Diagnóstico
- `stopPropagation/handled` introduce riesgo de romper extensiones existentes si el orden/contrato no está probado.

### Definición
- MUST: Suite mínima de compatibilidad para extensiones instaladas (smoke tests) antes de cambiar el pipeline.

### Validación
- Test: extensión A “toma” el mensaje (`stopPropagation=true`) ⇒ extensiones posteriores no se ejecutan.
- Test: extensiones legacy sin retorno explícito ⇒ comportamiento backward-compatible.

---

## WES-130 — Modelo de datos WES (DB) + Schema ORM

### Diagnóstico
- No existen tablas WES: `works`, `work_slots`, `work_events`, `external_effects`.

### Definición
- Crear el set mínimo:
  - `fluxcore_work_definitions`
  - `fluxcore_works`
  - `fluxcore_work_slots`
  - `fluxcore_work_events`
  - `fluxcore_proposed_works`
  - `fluxcore_decision_events`
  - `fluxcore_semantic_contexts`
  - `fluxcore_external_effect_claims`
  - `fluxcore_external_effects`

- MUST: Definir el esquema mínimo (columnas y constraints) antes de ejecutar la migración.

Esquema mínimo recomendado (orientativo, tenant-first):

- `fluxcore_work_definitions`:
  - `id`
  - `account_id`
  - `type_id`
  - `version`
  - `definition_json` (WorkDefinition: slots, transitions, policies)
  - `created_at`
  - UNIQUE `(account_id, type_id, version)`

- `fluxcore_works`:
  - `id`
  - `account_id`, `relationship_id`, `conversation_id`
  - `type_id`, `definition_version`
  - `state`
  - `revision` (optimistic concurrency)
  - `expires_at` (nullable)
  - `created_at`, `updated_at`
  - INDEX `(account_id, relationship_id, conversation_id, state)`

- `fluxcore_work_slots`:
  - `id`
  - `account_id`, `work_id`
  - `path`
  - `type`
  - `value_json`
  - `source`
  - `immutable_after_set`
  - `set_by`, `set_at`
  - `evidence_ref`
  - UNIQUE `(work_id, path)`

- `fluxcore_work_events`:
  - `id`
  - `account_id`, `work_id`
  - `event_type`
  - `actor`
  - `trace_id`
  - `work_revision`
  - `delta_json`
  - `evidence_ref`
  - `created_at`
  - INDEX `(work_id, created_at)`

- `fluxcore_external_effects`:
  - `id`
  - `account_id`, `work_id`
  - `tool_name`
  - `tool_call_id`
  - `idempotency_key`
  - `request_json`, `response_json`
  - `status`
  - `started_at`, `finished_at`
  - UNIQUE `(account_id, idempotency_key)`

- `fluxcore_external_effect_claims` (exactly-once causal lock):
  - `id`
  - `account_id`, `semantic_context_id`, `effect_type`, `work_id`
  - `status` (`claimed|completed|aborted`)
  - `claimed_at`, `released_at`
  - UNIQUE `(account_id, semantic_context_id, effect_type)` WHERE status IN (`claimed`,`completed`)

### Transición (DB + ORM)
- MUST: seguir `6. MIGRATIONS_REASONING_PROTOCOL.md`.
- En `packages/db/src/schema/`:
  - agregar tablas e índices tenant-first

### Validación (DB viva)
- `\dt public.*` incluye tablas nuevas.
- `\d+ <tabla>` confirma índices y FKs.
- Inserción/lectura simple desde API (endpoint temporal interno) o script audit.

### Documentación
- Actualizar `6. MIGRATIONS_REASONING_PROTOCOL.md` (bloque “Evidencia persistente”) con fecha/comandos.

---

## WES-135 — Formato estándar de Delta + WorkEvents reproducibles

### Diagnóstico
- Sin un formato de `delta` estandarizado, la auditoría pierde reproducibilidad y el debugging se vuelve no causal.

### Definición
- MUST: Definir el formato estándar de `delta` (lista de `ops`) y almacenarlo en `fluxcore_work_events.delta_json`.
- MUST: Cada commit del WES genera al menos 1 `WorkEvent`.

### Transición
- Implementar helpers puros:
  - `applyDelta(state, delta) -> newState`
  - `validateDelta(definition, state, delta) -> ok/error`

### Validación
- Test: reconstrucción de estado desde events (mínimo: aplicar deltas en orden) produce el mismo snapshot.

---

## WES-140 — WorkDefinition Registry versionado

### Definición
- MUST: WorkDefinition tiene `typeId` + `version`.
- MUST: work abierto referencia una versión inmutable.

### Transición
- Implementar “registry” inicial:
  - modo A (recomendado): DB-backed (`fluxcore_work_definitions`)
  - modo B: code-backed + hash + “published to DB”

### Validación
- Test: abrir Work y asegurar que cambios posteriores a WorkDefinition no alteran Works existentes.

---

## WES-145 — Concurrencia y determinismo (revision/locks)

### Diagnóstico
- Sin un mecanismo explícito de concurrencia, se crean estados corruptos y efectos duplicados.

### Definición
- MUST: Cada commit al Work incrementa `revision` y valida optimistic concurrency.
- MUST: Commit conflict ⇒ error explícito y reintento controlado.

### Validación
- Test: dos commits concurrentes con misma `revision` ⇒ uno falla por conflicto.

---

## WES-150 — Work Engine: FSM + Slot validation + Commit firewall

### Definición
- Implementar engine con:
  - `openWork`
  - `ingestMessage`
  - `validateDelta`
  - `commit`
  - `transition`
- FSM mínima:
  - `CREATED | ACTIVE | WAITING_USER | EXECUTING | COMPLETED | FAILED | EXPIRED`

### Transición (código)
- Ubicación recomendada: nueva extensión `extensions/work-engine` (alineado a TOTEM: core sagrado, lógica en extensiones).

### Validación
- Unit tests:
  - slot required
  - slot type
  - slot immutable
  - transición inválida
  - optimistic revision conflict

---

## WES-155 — SemanticContext + SemanticCommit (confirmación no conversacional)

### Diagnóstico
- Sin `semanticContextId`, un "sí" es conversacional (no auditable) y puede provocar efectos distintos en tiempos distintos.

### Definición
- MUST: Cada solicitud de confirmación genera `semanticContextId` persistido en `fluxcore_semantic_contexts` con estado `pending`.
- MUST: Un mensaje del usuario tipo confirmación ("sí/ok/dale") se resuelve contra contextos `pending` sin invocar LLM.
- MUST: Un `semanticContextId` solo puede consumirse 1 vez (`consumed`).
- MUST: `SemanticCommit` se registra como `WorkEvent(eventType='semantic_commit')` con `semanticContextId` + `evidenceRef`.
- MUST: Si el Work original expiró/terminal, el sistema reabre Work desde `semanticContextId` (sin generar ProposedWork nuevo desde el mensaje de confirmación).

### Validación
- Tests:
  - dado `semantic_confirmation_requested` pendiente, mensaje "sí" produce `semantic_commit` y consume el contexto.
  - sin contextos pendientes, "sí" no modifica slots.
  - si el Work expiró, la confirmación dispara reapertura desde contexto (sin re-interpretar).

---
## WES-158 — ExternalEffectClaim (exactly-once por confirmación)

### Diagnóstico
- La idempotencia externa evita duplicados en el proveedor, pero no garantiza exactamente‑once causal en el WES.

### Definición
- MUST: Antes de ejecutar una tool irreversible, el WES adquiere un claim persistente:
  - clave `(account_id, semantic_context_id, effect_type)`
  - si el claim ya existe, MUST abortar sin invocar la tool.
- MUST: Registrar `WorkEvent(eventType='external_effect_claim_failed')` en caso de conflicto.
- MUST: Un scheduler NO reintenta si no puede adquirir claim por duplicado (porque la causalidad ya fue tomada por otro proceso).

### Validación
- Tests:
  - dos ejecuciones concurrentes para el mismo `(semanticContextId,effectType)` ⇒ solo una obtiene claim.
  - la que falla por claim duplicado no invoca tool.

---

## WES-160 — Tool Contract transaccional + ExternalEffects + Idempotencia

### Definición
- Tools usadas por WES deben retornar:
  - `status`, `delta`, `effect`, `audit`, `idempotencyKey`

### Transición
- Persistir `ExternalEffect` por `idempotencyKey`.
- Retry para `recoverable_error` con backoff.

- MUST: La idempotencia de la tool NO reemplaza el control de causalidad del WES.
- MUST: Toda tool irreversible se ejecuta solo después de adquirir `ExternalEffectClaim` (ver WES-158).

### Validación
- Reprocesar mismo `messageId/toolCallId` no duplica efectos.

---

## WES-165 — Expiración: policies + Scheduler

### Diagnóstico
- `expiresAt` existe como necesidad operacional; si no se define, quedan Works colgados y aumenta costo/ambigüedad.

### Definición
- MUST: WorkDefinition declara política de expiración (`ttl` o derivación de `expiresAt`).
- MUST: Scheduler marca `EXPIRED` y genera `WorkEvent(eventType='expired')`.

### Validación
- Test: Work con `expiresAt` en pasado ⇒ transición a `EXPIRED` + evento.

---

## WES-170 — Integración con IA (Interpreter) sin violar invariantes

### Definición
- IA solo propone candidatos; no commitea.
- SHOULD: La IA solo se invoca para generar `ProposedWork` cuando NO hay Work activo.
- MUST: La confirmación "sí/ok" se resuelve con SemanticContext (no LLM).

### Transición
- El engine consume propuestas como `interpreter_candidate` y exige confirmación o validación estricta.

### Validación
- Tests:
  - propuesta incorrecta no muta slots
  - engine solicita confirmación
  - "sí" no dispara ProposedWork nuevo

---

## WES-180 — Work Inspector UI (operación enterprise)

### Definición
- UI para:
  - listar Works por cuenta
  - ver slots y eventos
  - ver efectos externos
  - reintentar/expirar (según permisos)

### Validación
- Manual QA + snapshots de estados.

---

## WES-190 — Hardening (SLO/observabilidad/seguridad)

### Definición
- TraceId end-to-end
- métricas p95/p99
- runbooks

### Validación
- dashboards básicos + alertas

---

## Checklists de “Definition of Done” por hito

### DoD técnico
- Tests relevantes pasan.
- `bun run build` pasa.
- No se rompen invariantes de `TOTEM.md`.
- Migraciones (si aplica) cumplen el protocolo.

### DoD de documentación
- Se actualiza o crea doc de diseño para lo introducido.
- Se anotan rutas de código y contratos (sin ambigüedad).
