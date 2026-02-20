# FluxCore v8.2 — Plan de Implementación Completo

**Documento:** Plan de ejecución basado en FLUXCORE_CANON.md v8.2  
**Objetivo:** Implementar la arquitectura canónica con auditorías, pruebas y máxima reutilización  
**Estrategia:** Coexistencia mediante feature flags, migración incremental, eliminación del código legacy

---

## 0. Principios Rectores de la Implementación

### 0.1 Mandatos de Ejecución

1. **El Canon es ley**: Si el código contradice el Canon, el código está en error
2. **Auditar antes de crear**: Identificar componentes existentes reutilizables
3. **Probar cada hito**: Cada fase incluye pruebas de integración y validación de invariantes
4. **Coexistencia segura**: Feature flags por cuenta, nunca mezclar caminos
5. **Documentar decisiones**: Registrar qué se reutiliza, qué se reescribe y por qué

### 0.2 Componentes Existentes a Auditar

**Kernel y Proyectores:**
- ✅ `apps/api/src/core/kernel.ts` — RFC-0001 implementado y congelado
- ✅ `apps/api/src/core/kernel/base.projector.ts` — Contrato de proyectores
- ⚠️ `apps/api/src/core/projections/chat-projector.ts` — Requiere atomicidad
- ⚠️ `apps/api/src/services/fluxcore/identity-projector.service.ts` — Requiere atomicidad
- ⚠️ `apps/api/src/services/session-projector.service.ts` — Verificar atomicidad

**Runtimes:**
- ⚠️ `apps/api/src/services/runtimes/fluxcore-runtime.adapter.ts` — Asistentes Local (refactor)
- ⚠️ `apps/api/src/services/runtimes/agent-runtime.adapter.ts` — No es runtime canónico
- ❌ Fluxi runtime — No existe, crear desde cero

**UI y Frontend:**
- ✅ `apps/web/src/components/chat/MessageBubble.tsx` — Reutilizable
- ✅ `apps/web/src/components/chat/` — UI conversacional completa
- ✅ WebSocket infrastructure — Reutilizable
- ✅ Templates UI — Reutilizable

**Servicios:**
- ✅ `apps/api/src/services/ai.service.ts` — LLM providers (refactor menor)
- ✅ `apps/api/src/services/rag.service.ts` — Vector store (reutilizable)
- ✅ `apps/api/src/services/template.service.ts` — Plantillas (reutilizable)
- ⚠️ `apps/api/src/services/message-dispatch.service.ts` — Reemplazar con CognitiveDispatcher
- ❌ `apps/api/src/services/extension-host.service.ts` — Eliminar en Fase 5

**Base de datos:**
- ✅ Tablas del Kernel (RFC-0001) — Existen y están congeladas
- ❌ `fluxcore_cognition_queue` — No existe, crear
- ⚠️ Tabla `messages` — Verificar constraint `UNIQUE (signal_id)`
- ❌ Tablas de Fluxi/WES — No existen, crear

---

## HITO 0: AUDITORÍA Y PREPARACIÓN (3-5 días) ✅ COMPLETADO

### Objetivo
Inventariar el estado actual del sistema, identificar qué se reutiliza, qué se refactoriza y qué se crea desde cero.

### Tareas

#### H0.1 — Auditoría del Kernel y Proyectores
- [x] Verificar que `kernel.ts` cumple RFC-0001 al 100%
- [x] Verificar triggers de inmutabilidad en `fluxcore_signals`
- [x] Auditar `BaseProjector`: ¿cumple el contrato canónico?
- [x] Revisar `ChatProjector`: ¿es atómico? ¿actualiza cursor en la misma tx?
- [x] Revisar `IdentityProjector`: ¿es atómico? ¿es puro?
- [x] Revisar `SessionProjector`: ¿es necesario para v8.2?

**Entregable:** `docs/fluxcore/AUDIT_KERNEL_PROJECTORS.md` ✅

#### H0.2 — Auditoría de Tablas y Esquema
- [x] Verificar que `messages` tiene `UNIQUE (signal_id)`
- [x] Verificar que `conversations`, `accounts`, `relationships` son derivadas
- [x] Verificar que no hay lógica de negocio en triggers de ChatCore
- [x] Listar tablas de FluxCore existentes vs. requeridas por Canon
- [x] Identificar tablas legacy que deben eliminarse en Fase 5

**Entregable:** `docs/fluxcore/AUDIT_DATABASE_SCHEMA.md` ✅

#### H0.3 — Auditoría de Runtimes Existentes
- [x] Revisar `fluxcore-runtime.adapter.ts`: ¿cumple contrato `RuntimeAdapter`?
- [x] Identificar acoplamiento a DB en runtimes actuales
- [x] Identificar acoplamiento a servicios externos
- [x] Documentar qué partes son reutilizables (PromptBuilder, LLM clients)
- [x] Documentar qué partes violan soberanía

**Entregable:** `docs/fluxcore/AUDIT_RUNTIMES.md` ✅

#### H0.4 — Auditoría de UI y Frontend
- [x] Verificar que `MessageBubble.tsx` soporta `generatedBy: 'system'`
- [x] Verificar que WebSocket handler escucha `message.received` y `message.sent`
- [x] Verificar que UI de templates es reutilizable
- [x] Verificar que UI de configuración de cuenta es extensible
- [x] Identificar componentes que asumen lógica de IA (violan separación)

**Entregable:** `docs/fluxcore/AUDIT_FRONTEND.md` ✅

#### H0.5 — Auditoría de Servicios y Herramientas
- [x] Listar servicios de ChatCore que deben exponerse como herramientas
- [x] Verificar que `template.service.ts` no tiene lógica de IA
- [x] Verificar que `rag.service.ts` puede recibir `PolicyContext`
- [x] Identificar servicios que deben moverse de ChatCore a FluxCore
- [x] Identificar servicios que deben eliminarse

**Entregable:** `docs/fluxcore/AUDIT_SERVICES_TOOLS.md` ✅

#### H0.6 — Plan de Migración de Datos
- [x] Identificar cuentas de prueba para feature flag
- [x] Diseñar estrategia de rollback si falla migración
- [x] Definir métricas de éxito por fase
- [x] Diseñar queries de validación de invariantes
- [x] Preparar scripts de monitoreo

**Entregable:** `docs/fluxcore/MIGRATION_STRATEGY.md` ✅

### Criterios de Aceptación H0
- ✅ Todos los audits completados y documentados
- ✅ Lista clara de componentes: reutilizar / refactor / crear / eliminar
- ✅ Plan de migración aprobado
- ✅ Métricas y queries de validación definidas

---

## HITO 1: PROYECTORES ATÓMICOS Y COLA DE COGNICIÓN (5-7 días) ✅ COMPLETADO

### Objetivo
Reescribir proyectores para que sean atómicos, puros e idempotentes. Introducir `fluxcore_cognition_queue` sin activar el nuevo flujo cognitivo.

### Pre-requisitos
- ✅ HITO 0 completado
- ✅ Kernel RFC-0001 verificado y congelado

### Tareas

#### H1.1 — Crear `fluxcore_cognition_queue` ✅
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

- [x] Crear migración SQL
- [x] Crear schema Drizzle
- [x] Aplicar migración en dev
- [x] Verificar constraint parcial funciona
- [x] Verificar índice se usa en query plan

**Entregable:** `packages/db/migrations/0XX_cognition_queue.sql` ✅

#### H1.2 — Agregar `UNIQUE (signal_id)` a `messages` ✅
```sql
ALTER TABLE messages ADD CONSTRAINT messages_signal_id_unique UNIQUE (signal_id);
```

- [x] Verificar que no hay duplicados actuales
- [x] Crear migración SQL
- [x] Aplicar en dev
- [x] Probar idempotencia: insertar mismo signal_id dos veces

**Entregable:** Migración aplicada y probada ✅

#### H1.3 — Refactor `IdentityProjector` (Atómico) ✅
- [x] Verificar que extiende `BaseProjector`
- [x] Verificar que `project()` es puro (no llama servicios)
- [x] Verificar que cursor se actualiza en la misma tx
- [ ] Agregar tests de idempotencia
- [ ] Agregar tests de atomicidad (rollback en error)

**Entregable:** `apps/api/src/services/fluxcore/identity-projector.service.ts` ✅

#### H1.4 — Refactor `ChatProjector` (Atómico + Encolado) ✅
- [x] Reescribir para que sea atómico
- [x] Agregar escritura en `fluxcore_cognition_queue` dentro de la tx
- [x] Implementar upsert con extensión de ventana
- [x] Usar `ON CONFLICT (signal_id) DO NOTHING` en `messages`
- [ ] Emitir `message.received` **post-transacción**
- [ ] Agregar tests de atomicidad
- [ ] Agregar tests de turn-window extension

**Entregable:** `apps/api/src/core/projections/chat-projector.ts` ✅

#### H1.5 — Typing/State Signals en ChatProjector ✅ (NUEVO)
- [x] ChatProjector ahora despacha por `factType` (EXTERNAL_INPUT_OBSERVED vs EXTERNAL_STATE_OBSERVED)
- [x] Señales de typing/recording extienden `turn_window_expires_at` en +5s sin crear mensajes
- [x] Señales de idle/cancel se ignoran
- [x] Si no hay turno pendiente, typing se ignora silenciosamente

**Entregable:** `chat-projector.ts` actualizado con `projectStateChange()`

**Patrón obligatorio:**
```typescript
async project(signal: KernelSignal, tx: Transaction) {
  // 1. Insertar mensaje (idempotente)
  await tx.insert(messages).values({
    id: generateId(),
    signalId: signal.sequenceNumber,
    // ...
  }).onConflictDoNothing({ target: messages.signalId });

  // 2. Actualizar conversación
  await tx.insert(conversations).values(/* ... */).onConflictDoUpdate(/* ... */);

  // 3. Encolar cognición (upsert con extensión de ventana)
  await tx.insert(fluxcoreCognitionQueue).values({
    conversationId,
    accountId,
    lastSignalSeq: signal.sequenceNumber,
    turnWindowExpiresAt: new Date(Date.now() + turnWindowMs),
  }).onConflictDoUpdate({
    target: fluxcoreCognitionQueue.conversationId,
    where: isNull(fluxcoreCognitionQueue.processedAt),
    set: {
      lastSignalSeq: signal.sequenceNumber,
      turnWindowExpiresAt: new Date(Date.now() + turnWindowMs),
    },
  });
}
```

#### H1.5 — Tests de Proyectores
- [ ] Test: señal duplicada no crea mensaje duplicado
- [ ] Test: error en proyección hace rollback completo (cursor no avanza)
- [ ] Test: señales en ráfaga extienden ventana, no crean múltiples entradas
- [ ] Test: reconstrucción completa desde sequence_number=0 produce mismo estado
- [ ] Test: `message.received` se emite solo después de commit

**Entregable:** `apps/api/src/core/projections/__tests__/`

#### H1.6 — Validación de Invariantes
- [ ] Query: verificar que no hay mensajes sin signal_id
- [ ] Query: verificar que no hay múltiples entradas pendientes por conversation_id
- [ ] Query: verificar que todo cursor <= max(sequence_number)
- [ ] Script de validación ejecutable

**Entregable:** `scripts/validate-projectors.ts`

### Criterios de Aceptación H1
- ✅ `fluxcore_cognition_queue` creada y funcionando
- ✅ `messages.signal_id` es UNIQUE
- ✅ Proyectores son atómicos (cursor en la misma tx)
- ✅ Proyectores son puros (no llaman servicios externos)
- ✅ Proyectores son idempotentes (ON CONFLICT DO NOTHING)
- ✅ Turn-window extension funciona correctamente
- ✅ Tests de atomicidad e idempotencia pasan
- ✅ Script de validación de invariantes pasa
- ✅ **Sistema legacy sigue funcionando** (no se activa nuevo flujo)

---

## HITO 2: INFRAESTRUCTURA DE COGNICIÓN (7-10 días)

### Objetivo
Implementar `CognitionWorker`, `CognitiveDispatcher`, `RuntimeGateway`, `ActionExecutor` y `PolicyContext`. Sin activar runtimes nuevos.

### Pre-requisitos
- ✅ HITO 1 completado
- ✅ Proyectores atómicos funcionando
- ✅ `fluxcore_cognition_queue` poblándose correctamente

### Tareas

#### H2.1 — Implementar `PolicyContext` y Servicio de Resolución
```typescript
interface FluxPolicyContext {
  accountId: string;
  contactId: string;
  channel: string;
  
  // Atención
  tone: 'formal' | 'casual' | 'neutral';
  useEmojis: boolean;
  language: string;
  
  // Automatización
  mode: 'auto' | 'suggest' | 'off';
  responseDelayMs: number;
  
  // Turno conversacional
  turnWindowMs: number;
  turnWindowMaxMs: number;
  
  // Runtime
  activeRuntimeId: string;
  assistantInstructions?: string;
  assistantExternalId?: string;
  
  // Herramientas autorizadas
  authorizedTools: string[];
  authorizedTemplates: string[];
}
```

- [ ] Crear tipos en `packages/types/src/fluxcore/policy-context.ts`
- [ ] Implementar `FluxPolicyContextService.resolve(accountId, contactId)`
- [ ] Leer configuración desde `extension_installations.config` (ChatCore)
- [ ] Leer preferencias de atención desde FluxCore config
- [ ] Agregar defaults sensatos
- [ ] Tests unitarios

**Entregable:** `apps/api/src/services/fluxcore/policy-context.service.ts`

#### H2.2 — Implementar `CognitionWorker` ✅
- [x] Worker que consulta `fluxcore_cognition_queue`
- [x] Query: `WHERE processed_at IS NULL AND turn_window_expires_at < now()`
- [x] Usar `FOR UPDATE SKIP LOCKED` para concurrencia
- [ ] Verificar identidad materializada (backoff 500ms si no está)
- [x] Leer todos los mensajes del turno desde `messages`
- [x] Construir `PolicyContext`
- [x] Obtener historial previo (últimos N mensajes)
- [x] Invocar `CognitiveDispatcher.dispatch()`
- [x] Marcar `processed_at` al completar
- [x] Registrar errores en `last_error` y reintentar con backoff

**Entregable:** `apps/api/src/workers/cognition-worker.ts` ✅

#### H2.3 — Implementar `CognitiveDispatcher` ✅
- [x] Recibe: `signal`, `policyContext`, `conversationHistory`, `turnMessages`
- [x] Valida que `policyContext.mode !== 'off'`
- [x] Invoca `RuntimeGateway.invoke(runtimeId, input)`
- [x] Pasa resultado a `ActionExecutor`
- [x] Maneja errores y los propaga al worker

**Entregable:** `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts` ✅

#### H2.4 — Implementar `RuntimeGateway` ✅
```typescript
interface RuntimeAdapter {
  readonly runtimeId: string;
  handleTurn(input: RuntimeInput): Promise<ExecutionAction[]>;
}

interface RuntimeInput {
  conversationId: string;
  accountId: string;
  turnMessages: Message[];
  conversationHistory: Message[];
  policyContext: FluxPolicyContext;
  lastSignalSeq: number;
}
```

- [x] Registro de runtimes: `Map<string, RuntimeAdapter>`
- [x] Método `register(runtime: RuntimeAdapter)`
- [x] Método `invoke(runtimeId, input): Promise<ExecutionAction[]>`
- [x] Validar que runtime existe
- [x] Timeout configurable (30s default)
- [x] Logging de invocaciones
- [ ] Tests con runtime mock

**Entregable:** `apps/api/src/services/fluxcore/runtime-gateway.service.ts` ✅

#### H2.5 — Implementar `ActionExecutor` (Versión Inicial) ✅

**NOTA IMPORTANTE:** Esta es una implementación inicial con acciones básicas para validar el flujo. Las acciones de Fluxi se agregarán en H4.

```typescript
type ExecutionAction =
  | { type: 'send_message'; content: string; conversationId: string }
  | { type: 'send_template'; templateId: string; conversationId: string }
  | { type: 'start_typing'; conversationId: string }
  | { type: 'no_action'; reason: string };
  // DEUDA: acciones de Fluxi se agregan en H4
```

- [x] Recibe `ExecutionAction[]` del runtime
- [ ] Valida permisos contra `PolicyContext.authorizedTools`
- [x] Ejecuta cada acción:
  - `send_message`: inserta en `messages` con estado `pending`, emite evento
  - `send_template`: placeholder (TODO H3)
  - `start_typing`: emite typing indicator via ChatCore
  - `no_action`: solo registra log
- [ ] Registra auditoría de cada acción ejecutada
- [x] Maneja errores por acción (no falla todo el batch)
- [ ] Tests unitarios por tipo de acción
- [x] **Diseñar arquitectura extensible** para agregar acciones en H4

**Entregable:** `apps/api/src/services/fluxcore/action-executor.service.ts` ✅

**Deuda Técnica:** Acciones de Fluxi pendientes para H4

#### H2.6 — Feature Flag por Cuenta
- [ ] Agregar campo `useNewArchitecture: boolean` en `extension_installations.config`
- [ ] Default: `false` (usa camino legacy)
- [ ] Modificar `ChatProjector`: si `useNewArchitecture=false`, no encolar en cognition_queue
- [ ] Modificar `CognitionWorker`: solo procesar cuentas con `useNewArchitecture=true`
- [ ] UI para activar/desactivar flag (admin only)

**Entregable:** Feature flag implementado y probado

#### H2.7 — Tests de Integración
- [ ] Test: mensaje llega → proyector encola → worker procesa → dispatcher invoca gateway
- [ ] Test: runtime devuelve `send_message` → executor inserta mensaje pending
- [ ] Test: runtime devuelve `no_action` → se registra log
- [ ] Test: error en runtime → se registra en `last_error`, se reintenta
- [ ] Test: turn-window no vencida → worker no procesa
- [ ] Test: identidad no materializada → worker extiende ventana

**Entregable:** `apps/api/src/__tests__/integration/cognition-flow.test.ts`

### Criterios de Aceptación H2
- ✅ `PolicyContext` se resuelve correctamente desde configuración
- ✅ `CognitionWorker` consume cola y respeta turn-window
- ✅ `CognitiveDispatcher` invoca `RuntimeGateway` correctamente
- ✅ `RuntimeGateway` puede registrar y invocar runtimes
- ✅ `ActionExecutor` ejecuta acciones y valida permisos
- ✅ Feature flag funciona: cuentas legacy no usan nuevo flujo
- ✅ Tests de integración pasan
- ✅ **Sistema legacy sigue funcionando para cuentas con flag=false**

---

## HITO 3: RUNTIME ASISTENTES LOCAL (7-10 días)

### Objetivo
Reescribir `AsistentesLocal` como `RuntimeAdapter` canónico, soberano, sin acceso a DB.

### Pre-requisitos
- ✅ HITO 2 completado
- ✅ `RuntimeGateway` funcionando
- ✅ `ActionExecutor` funcionando

### Tareas

#### H3.1 — Refactor `AsistentesLocalRuntime`
- [ ] Implementar interfaz `RuntimeAdapter`
- [ ] Eliminar acceso directo a DB
- [ ] Recibir todo contexto vía `RuntimeInput`
- [ ] Inyectar servicios síncronos (RAG, LLM clients)
- [ ] Implementar `handleMessage(input): Promise<ExecutionAction[]>`

**Estructura:**
```typescript
class AsistentesLocalRuntime implements RuntimeAdapter {
  readonly runtimeId = 'asistentes-local';

  constructor(
    private readonly llmClient: LLMClient,
    private readonly ragService: RAGService,
  ) {}

  async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
    const { signal, policyContext, conversationHistory } = input;
    
    // 1. Construir prompt con PromptBuilder
    const prompt = this.buildPrompt(policyContext, conversationHistory);
    
    // 2. Llamar LLM con fallback entre providers
    const response = await this.callLLM(prompt, policyContext);
    
    // 3. Tool loop (máximo 2 rounds)
    const actions = await this.processToolCalls(response, policyContext);
    
    return actions;
  }
}
```

#### H3.2 — Refactor `PromptBuilder`
- [ ] Separar secciones: PolicyContext (prioridad) + Asistente
- [ ] Inyectar tono, formalidad, emojis desde `policyContext`
- [ ] Inyectar instrucciones del asistente
- [ ] Formatear historial conversacional
- [ ] Tests unitarios

**Entregable:** `apps/api/src/services/fluxcore/prompt-builder.service.ts`

#### H3.3 — Implementar Fallback entre Providers
- [ ] Orden de prioridad desde `PolicyContext.executionPlan`
- [ ] Intentar Groq → OpenAI completions → error
- [ ] Registrar qué provider se usó
- [ ] Tests con mocks

**Entregable:** Provider fallback implementado

#### H3.4 — Implementar Tool Loop
- [ ] Detectar tool calls en respuesta LLM
- [ ] Máximo 2 rounds de herramientas
- [ ] Herramientas soportadas:
  - `search_knowledge`: llama `ragService.search(query, policyContext)`
  - `send_template`: devuelve acción `send_template`
  - `list_available_templates`: devuelve acción con lista
- [ ] Construir respuesta final
- [ ] Tests con mocks

**Entregable:** Tool loop implementado

#### H3.5 — Integración con `ExecutionPlan`
- [ ] Verificar que `ExecutionPlan` está resuelto en `PolicyContext`
- [ ] Si plan bloqueado (`type: 'blocked'`), devolver `no_action`
- [ ] Si plan elegible, proceder con LLM
- [ ] Tests con plan bloqueado

**Entregable:** Integración con ExecutionPlan

#### H3.6 — Registrar Runtime en Gateway
- [ ] Instanciar `AsistentesLocalRuntime` en startup
- [ ] Registrar en `RuntimeGateway`
- [ ] Configurar como runtime por defecto para cuentas nuevas

**Entregable:** Runtime registrado

#### H3.7 — Tests de Runtime
- [ ] Test: mensaje simple → respuesta texto
- [ ] Test: mensaje con tool call → ejecuta herramienta → respuesta
- [ ] Test: plan bloqueado → devuelve `no_action`
- [ ] Test: error en LLM → propaga error
- [ ] Test: tool loop excede 2 rounds → corta y responde
- [ ] Test: runtime no accede a DB (mock DB y verificar no se llama)

**Entregable:** `apps/api/src/services/runtimes/__tests__/asistentes-local.test.ts`

### Criterios de Aceptación H3
- ✅ `AsistentesLocalRuntime` implementa `RuntimeAdapter`
- ✅ Runtime no accede a DB durante `handleMessage`
- ✅ Runtime recibe todo contexto vía `PolicyContext`
- ✅ PromptBuilder inyecta políticas de atención correctamente
- ✅ Fallback entre providers funciona
- ✅ Tool loop funciona (máximo 2 rounds)
- ✅ ExecutionPlan bloqueado previene invocación a LLM
- ✅ Tests de runtime pasan
- ✅ Runtime registrado en gateway

---

## HITO 4: RUNTIME FLUXI / WES (14-21 días)

### Objetivo
Implementar Fluxi como `RuntimeAdapter` transaccional determinista con Work Engine, SemanticContext y ExternalEffectClaims.

### ⚠️ ADVERTENCIA CRÍTICA — Violaciones del Canon

**Este es el hito más propenso a violaciones del Canon.** Fluxi es donde más fácilmente se puede caer en acceso directo a DB "porque es más simple".

**ANTES DE EMPEZAR H4, VERIFICAR:**
1. ✅ El `Work Engine` recibe **todas** sus dependencias por inyección de constructor
2. ✅ **NINGÚN** servicio de Fluxi tiene `import` directo a Drizzle o esquemas de DB
3. ✅ **NINGÚN** servicio de Fluxi tiene `import` directo a Postgres
4. ✅ Todos los servicios reciben `PolicyContext` y datos ya resueltos
5. ✅ `FluxiRuntime.handleMessage()` no accede a DB durante su ejecución
6. ✅ La persistencia de Works/Slots/Events ocurre **solo** en `ActionExecutor`

**Si alguno de estos checks falla, DETENER y rediseñar antes de continuar.**

### Pre-requisitos
- ✅ HITO 3 completado
- ✅ `AsistentesLocal` funcionando como runtime
- ✅ Verificación de soberanía completada (ver advertencia arriba)

### Tareas

#### H4.1 — Crear Tablas de Fluxi
```sql
CREATE TABLE fluxcore_work_definitions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  binding_attribute TEXT NOT NULL,
  required_slots JSONB NOT NULL,
  fsm_definition JSONB NOT NULL,
  ttl_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fluxcore_works (
  id TEXT PRIMARY KEY,
  work_definition_id TEXT NOT NULL REFERENCES fluxcore_work_definitions(id),
  conversation_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE TABLE fluxcore_work_slots (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES fluxcore_works(id),
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  value JSONB,
  source TEXT,
  evidence TEXT,
  set_by TEXT,
  set_at TIMESTAMPTZ,
  UNIQUE (work_id, path)
);

CREATE TABLE fluxcore_work_events (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES fluxcore_works(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE fluxcore_proposed_works (
  id TEXT PRIMARY KEY,
  work_definition_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  candidate_slots JSONB NOT NULL,
  evidence TEXT NOT NULL,
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE fluxcore_semantic_contexts (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES fluxcore_works(id),
  slot_path TEXT NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  UNIQUE (id) WHERE consumed_at IS NULL
);

CREATE TABLE fluxcore_external_effect_claims (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  semantic_context_id TEXT NOT NULL,
  effect_type TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (account_id, semantic_context_id, effect_type)
);

CREATE TABLE fluxcore_external_effects (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES fluxcore_external_effect_claims(id),
  work_id TEXT NOT NULL REFERENCES fluxcore_works(id),
  effect_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  result JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE fluxcore_decision_events (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  message_content TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  proposed_work_id TEXT REFERENCES fluxcore_proposed_works(id),
  work_id TEXT REFERENCES fluxcore_works(id),
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
```

- [ ] Crear migraciones SQL
- [ ] Crear schemas Drizzle
- [ ] Aplicar migraciones en dev
- [ ] Verificar constraints y índices

**Entregable:** `packages/db/migrations/0XX_fluxi_wes.sql`

#### H4.2 — Implementar WES Interpreter
- [ ] Componente cognitivo especializado
- [ ] Recibe: mensaje texto + `WorkDefinitions` activas
- [ ] Devuelve: `ProposedWork | null`
- [ ] Usa LLM para detectar intención transaccional
- [ ] Extrae `candidateSlots` y `evidence` textual
- [ ] Tests con casos positivos y negativos

**Entregable:** `apps/api/src/services/fluxi/wes-interpreter.service.ts`

#### H4.3 — Implementar Work Engine (FSM)
- [ ] Estados: CREATED, ACTIVE, WAITING_USER, WAITING_CONFIRMATION, EXECUTING, COMPLETED, FAILED, EXPIRED
- [ ] Transiciones válidas por estado
- [ ] Validación de transiciones antes de ejecutar
- [ ] Registro de `WorkEvent` en cada transición
- [ ] Tests de FSM

**Entregable:** `apps/api/src/services/fluxi/work-engine.service.ts`

#### H4.4 — Implementar Slot Resolution
- [ ] Extraer valores de slots desde mensaje usuario
- [ ] Validar tipos de slots
- [ ] Registrar `evidence` textual
- [ ] Marcar slot como `set_by` y `set_at`
- [ ] Tests de extracción

**Entregable:** `apps/api/src/services/fluxi/slot-resolver.service.ts`

#### H4.5 — Implementar SemanticContext
- [ ] Generar UUID único por pregunta
- [ ] Persistir pregunta + slot_path
- [ ] Resolver confirmación contra contexto pendiente
- [ ] Marcar como `consumed_at` al resolver
- [ ] Constraint: un contexto solo se consume una vez
- [ ] Tests de confirmación

**Entregable:** `apps/api/src/services/fluxi/semantic-context.service.ts`

#### H4.6 — Implementar ExternalEffectClaim
- [ ] Adquirir claim antes de invocar herramienta irreversible
- [ ] Clave: `(accountId, semanticContextId, effectType)`
- [ ] Si claim falla (ya existe), abortar
- [ ] Si tiene éxito, invocar herramienta con `idempotencyKey`
- [ ] Registrar `ExternalEffect` con resultado
- [ ] Tests de exactly-once

**Entregable:** `apps/api/src/services/fluxi/external-effect-claim.service.ts`

#### H4.7 — Implementar `FluxiRuntime`
```typescript
class FluxiRuntime implements RuntimeAdapter {
  readonly runtimeId = 'fluxi';

  async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
    // Fase 1: ¿Existe Work activo?
    const activeWork = await this.getActiveWork(input.conversationId);
    if (activeWork) {
      return this.continueWork(activeWork, input);
    }

    // Fase 2: Interpretación
    const proposedWork = await this.interpreter.interpret(
      input.message,
      input.policyContext.workDefinitions
    );
    if (!proposedWork) {
      return [{ type: 'send_message', content: 'No detecté intención operativa' }];
    }

    // Fase 3: Gate de Apertura
    const canOpen = await this.validateProposedWork(proposedWork);
    if (!canOpen) {
      return [{ type: 'no_action', reason: 'ProposedWork rejected by gate' }];
    }

    // Fase 4: Abrir Work
    return this.openWork(proposedWork, input);
  }
}
```

- [ ] Implementar flujo completo
- [ ] Integrar todos los servicios
- [ ] Registrar en `RuntimeGateway`
- [ ] Tests de integración

**Entregable:** `apps/api/src/services/runtimes/fluxi-runtime.adapter.ts`

#### H4.8 — Completar ActionExecutor con Acciones de Fluxi

**NOTA:** Esta tarea completa la deuda técnica dejada en H2.5. El ActionExecutor se extiende para soportar todas las acciones de Fluxi.

```typescript
type ExecutionAction =
  | { type: 'send_message'; content: string; conversationId: string }
  | { type: 'send_template'; templateId: string; conversationId: string }
  | { type: 'no_action'; reason: string }
  // NUEVAS ACCIONES DE FLUXI:
  | { type: 'propose_work'; workDefinitionId: string; candidateSlots: any; evidence: string }
  | { type: 'open_work'; proposedWorkId: string }
  | { type: 'advance_work_state'; workId: string; newState: string }
  | { type: 'request_slot'; workId: string; slotPath: string; question: string }
  | { type: 'close_work'; workId: string; finalState: 'COMPLETED' | 'FAILED' };
```

- [ ] Extender tipos de `ExecutionAction` con acciones de Fluxi
- [ ] Implementar ejecución de cada acción:
  - `propose_work`: crear registro en `fluxcore_proposed_works`
  - `open_work`: instanciar Work desde ProposedWork, validar que existe
  - `advance_work_state`: transición de estado con validación FSM
  - `request_slot`: generar SemanticContext + mensaje al usuario
  - `close_work`: cerrar Work con estado final
- [ ] Validar permisos de Fluxi contra `PolicyContext`
- [ ] Registrar auditoría de cada acción
- [ ] Tests por tipo de acción
- [ ] Verificar que persistencia ocurre **solo** en ActionExecutor, no en FluxiRuntime

**Entregable:** ActionExecutor completo con todas las acciones de Fluxi

**Deuda Técnica Resuelta:** Acciones de Fluxi de H2.5

#### H4.9 — Tests de Fluxi
- [ ] Test: mensaje con intención transaccional → ProposedWork → Work abierto
- [ ] Test: mensaje sin intención → `no_action`
- [ ] Test: Work activo → mensaje continúa Work
- [ ] Test: slot ambiguo → genera SemanticContext → usuario confirma → slot resuelto
- [ ] Test: efecto externo → adquiere claim → invoca herramienta → registra efecto
- [ ] Test: claim duplicado → aborta sin invocar herramienta
- [ ] Test: Work expira → estado EXPIRED

**Entregable:** `apps/api/src/services/runtimes/__tests__/fluxi-runtime.test.ts`

### Criterios de Aceptación H4
- ✅ Tablas de Fluxi creadas y con constraints correctos
- ✅ WES Interpreter detecta intenciones transaccionales
- ✅ Work Engine implementa FSM correctamente
- ✅ SemanticContext funciona (una confirmación por contexto)
- ✅ ExternalEffectClaim garantiza exactly-once
- ✅ `FluxiRuntime` implementa `RuntimeAdapter`
- ✅ Fluxi nunca llama a runtime de Asistentes
- ✅ Fluxi no accede a DB durante `handleMessage` (solo servicios inyectados)
- ✅ Tests de Fluxi pasan
- ✅ Fluxi registrado en gateway

---

## HITO 5: RUNTIME ASISTENTES OPENAI (5-7 días)

### Objetivo
Implementar `AsistentesOpenAIRuntime` como puente hacia OpenAI Assistants API.

### Pre-requisitos
- ✅ HITO 3 completado
- ✅ `AsistentesLocal` funcionando

### Tareas

#### H5.1 — Implementar `AsistentesOpenAIRuntime`
```typescript
class AsistentesOpenAIRuntime implements RuntimeAdapter {
  readonly runtimeId = 'asistentes-openai';

  constructor(
    private readonly openaiClient: OpenAI,
  ) {}

  async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
    const { policyContext, conversationHistory } = input;
    
    // 1. Construir thread de OpenAI desde historial
    const thread = await this.buildThread(conversationHistory);
    
    // 2. Inyectar PolicyContext como override de instructions
    const instructions = this.buildInstructions(policyContext);
    
    // 3. Ejecutar assistant
    const run = await this.openaiClient.beta.threads.runs.create(thread.id, {
      assistant_id: policyContext.assistantExternalId,
      instructions,
    });
    
    // 4. Polling del run hasta completar
    const result = await this.pollRun(thread.id, run.id);
    
    // 5. Convertir respuesta a ExecutionAction[]
    return this.mapToActions(result);
  }
}
```

- [ ] Implementar construcción de thread
- [ ] Implementar inyección de PolicyContext
- [ ] Implementar polling de run
- [ ] Implementar mapeo a acciones
- [ ] Registrar en gateway

**Entregable:** `apps/api/src/services/runtimes/asistentes-openai-runtime.adapter.ts`

#### H5.2 — Tests de AsistentesOpenAI
- [ ] Test con mock de OpenAI API
- [ ] Test: PolicyContext se inyecta como override
- [ ] Test: respuesta se mapea a `send_message`
- [ ] Test: error en OpenAI se propaga correctamente

**Entregable:** Tests de AsistentesOpenAI

### Criterios de Aceptación H5
- ✅ `AsistentesOpenAIRuntime` implementa `RuntimeAdapter`
- ✅ PolicyContext se inyecta como override de instructions
- ✅ Thread se construye desde historial conversacional
- ✅ Polling de run funciona
- ✅ Tests pasan
- ✅ Runtime registrado en gateway

---

## HITO 6: ACTIVACIÓN Y MONITOREO (3-5 días)

### Objetivo
Activar nueva arquitectura para cuentas de prueba, monitorear, validar invariantes, escalar gradualmente.

### Pre-requisitos
- ✅ HITO 3, 4, 5 completados
- ✅ Todos los runtimes funcionando
- ✅ Tests de integración pasando

### Tareas

#### H6.1 — Activar para Cuentas Internas
- [ ] Identificar 2-3 cuentas de prueba
- [ ] Activar `useNewArchitecture=true`
- [ ] Monitorear logs por 24-48 horas
- [ ] Validar que no hay errores críticos
- [ ] Validar que invariantes se cumplen

**Entregable:** Cuentas internas usando nueva arquitectura

#### H6.2 — Dashboard de Monitoreo
- [ ] Métricas:
  - Mensajes procesados por camino (legacy vs nuevo)
  - Latencia de turn-window
  - Errores en CognitionWorker
  - Reintentos en cola de cognición
  - Acciones ejecutadas por tipo
  - Runtimes invocados (distribución)
- [ ] Alertas:
  - Cola de cognición creciendo sin procesar
  - Errores repetidos en mismo turno
  - Invariantes violados

**Entregable:** Dashboard de monitoreo

#### H6.3 — Script de Validación de Invariantes
```sql
-- Invariante 1: messages.signal_id es único
SELECT signal_id, COUNT(*) FROM messages GROUP BY signal_id HAVING COUNT(*) > 1;

-- Invariante 2: máximo una entrada pendiente por conversation_id
SELECT conversation_id, COUNT(*) 
FROM fluxcore_cognition_queue 
WHERE processed_at IS NULL 
GROUP BY conversation_id 
HAVING COUNT(*) > 1;

-- Invariante 3: todo cursor <= max(sequence_number)
SELECT p.projector_name, p.last_sequence_number, MAX(s.sequence_number) as max_seq
FROM fluxcore_projector_cursors p
CROSS JOIN fluxcore_signals s
GROUP BY p.projector_name, p.last_sequence_number
HAVING p.last_sequence_number > MAX(s.sequence_number);

-- Invariante 4: no hay ExternalEffectClaim sin ProposedWork
SELECT c.id FROM fluxcore_external_effect_claims c
LEFT JOIN fluxcore_proposed_works p ON c.semantic_context_id = p.id
WHERE p.id IS NULL;
```

- [ ] Ejecutar cada hora
- [ ] Alertar si alguna query devuelve filas

**Entregable:** `scripts/validate-invariants.sql`

#### H6.4 — Escalar a 10% de Cuentas
- [ ] Seleccionar 10% de cuentas activas aleatoriamente
- [ ] Activar `useNewArchitecture=true`
- [ ] Monitorear por 1 semana
- [ ] Validar métricas vs. cuentas legacy
- [ ] Ajustar configuración si es necesario

**Entregable:** 10% de cuentas en nueva arquitectura

#### H6.5 — Escalar a 50% de Cuentas
- [ ] Activar para 50% de cuentas
- [ ] Monitorear por 1 semana
- [ ] Validar estabilidad

**Entregable:** 50% de cuentas en nueva arquitectura

#### H6.6 — Escalar a 100% de Cuentas
- [ ] Activar para todas las cuentas
- [ ] Monitorear por 2 semanas
- [ ] Validar que sistema legacy ya no se usa

**Entregable:** 100% de cuentas en nueva arquitectura

### Criterios de Aceptación H6
- ✅ Cuentas internas funcionan correctamente
- ✅ Dashboard de monitoreo operativo
- ✅ Script de validación de invariantes pasa
- ✅ 100% de cuentas migradas sin incidentes
- ✅ Métricas de latencia y errores dentro de SLOs
- ✅ Sistema legacy ya no recibe tráfico

---

## HITO 7: ELIMINACIÓN DE CÓDIGO LEGACY (3-5 días)

### Objetivo
Eliminar `ExtensionHost`, `MessageCore` legacy, proyectores viejos y código muerto.

### Pre-requisitos
- ✅ HITO 6 completado
- ✅ 100% de cuentas en nueva arquitectura
- ✅ Sistema legacy sin tráfico por 2+ semanas

### Tareas

#### H7.1 — Eliminar ExtensionHost
- [ ] Eliminar `apps/api/src/services/extension-host.service.ts`
- [ ] Eliminar referencias en `server.ts`
- [ ] Eliminar tests de ExtensionHost
- [ ] Verificar que build pasa

**Entregable:** ExtensionHost eliminado

#### H7.2 — Eliminar MessageCore Legacy
- [ ] Eliminar métodos legacy de `MessageCore`
- [ ] Mantener solo métodos usados por proyectores
- [ ] Eliminar `ai-orchestrator.old.ts`
- [ ] Eliminar `message-dispatch.service.ts` legacy

**Entregable:** MessageCore limpiado

#### H7.3 — Eliminar Feature Flags
- [ ] Eliminar `useNewArchitecture` de config
- [ ] Eliminar condicionales en código
- [ ] Simplificar flujo (solo nuevo camino)

**Entregable:** Feature flags eliminados

#### H7.4 — Limpiar Dependencias
- [ ] Eliminar paquetes no usados
- [ ] Actualizar `package.json`
- [ ] Ejecutar `bun install`

**Entregable:** Dependencias limpias

#### H7.5 — Actualizar Documentación
- [ ] Marcar documentos legacy como obsoletos
- [ ] Actualizar README con nueva arquitectura
- [ ] Actualizar diagramas

**Entregable:** Documentación actualizada

### Criterios de Aceptación H7
- ✅ ExtensionHost eliminado
- ✅ MessageCore legacy eliminado
- ✅ Feature flags eliminados
- ✅ Build pasa sin warnings
- ✅ Tests pasan
- ✅ Documentación actualizada

---

## HITO 8: HERRAMIENTAS Y EXTENSIBILIDAD (5-7 días)

### Objetivo
Implementar registro de herramientas, mediación por ActionExecutor, y permitir que ChatCore exponga servicios como herramientas.

### Pre-requisitos
- ✅ HITO 7 completado
- ✅ Sistema legacy eliminado

### Tareas

#### H8.1 — Implementar ToolRegistry
```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: unknown, context: PolicyContext) => Promise<unknown>;
}

class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void;
  get(toolId: string): Tool | undefined;
  listAuthorized(context: PolicyContext): Tool[];
}
```

- [ ] Implementar registro de herramientas
- [ ] Implementar validación de permisos
- [ ] Tests unitarios

**Entregable:** `apps/api/src/services/fluxcore/tool-registry.service.ts`

#### H8.2 — Registrar Herramientas de ChatCore
- [ ] `send_template`: wrapper sobre `templateService`
- [ ] `list_available_templates`: wrapper sobre `templateService.list()`
- [ ] `get_contact_notes`: wrapper sobre `contactService.getNotes()`
- [ ] Verificar que wrappers no tienen lógica de IA

**Entregable:** Herramientas de ChatCore registradas

#### H8.3 — Registrar Herramientas de FluxCore
- [ ] `search_knowledge`: wrapper sobre `ragService`
- [ ] Verificar que recibe `PolicyContext`

**Entregable:** Herramientas de FluxCore registradas

#### H8.4 — Integrar ToolRegistry en ActionExecutor
- [ ] Resolver herramienta desde registro
- [ ] Validar permisos contra `PolicyContext.authorizedTools`
- [ ] Ejecutar herramienta
- [ ] Registrar auditoría
- [ ] Tests de validación de permisos

**Entregable:** ToolRegistry integrado en ActionExecutor

#### H8.5 — Tests de Herramientas
- [ ] Test: herramienta autorizada se ejecuta
- [ ] Test: herramienta no autorizada se rechaza
- [ ] Test: herramienta inexistente devuelve error
- [ ] Test: error en herramienta se propaga correctamente

**Entregable:** Tests de herramientas

### Criterios de Aceptación H8
- ✅ ToolRegistry implementado
- ✅ Herramientas de ChatCore registradas
- ✅ Herramientas de FluxCore registradas
- ✅ ActionExecutor valida permisos
- ✅ Tests de herramientas pasan

---

## HITO 9: OPTIMIZACIONES Y DEUDA TÉCNICA (7-10 días)

### Objetivo
Implementar re-invocación asíncrona para herramientas, optimizar turn-window, agregar métricas avanzadas.

### Pre-requisitos
- ✅ HITO 8 completado
- ✅ Sistema funcionando en producción

### Tareas

#### H9.1 — Re-invocación Asíncrona (v8.3)
- [ ] Runtime devuelve acción `search_knowledge` con `requestId`
- [ ] ActionExecutor ejecuta búsqueda y emite `tool.result`
- [ ] CognitionWorker re-invoca runtime con resultado y `continuationToken`
- [ ] Runtime reanuda ejecución
- [ ] Tests de re-invocación

**Entregable:** Re-invocación asíncrona implementada

#### H9.2 — Optimizar Turn-Window
- [ ] Analizar métricas de latencia por canal
- [ ] Ajustar `turnWindowMs` por canal
- [ ] Implementar `turnWindowMaxMs` como techo absoluto
- [ ] Tests de ventana máxima

**Entregable:** Turn-window optimizado

#### H9.3 — Métricas Avanzadas
- [ ] Latencia promedio por runtime
- [ ] Tasa de éxito por runtime
- [ ] Distribución de acciones ejecutadas
- [ ] Uso de herramientas por tipo
- [ ] Dashboard actualizado

**Entregable:** Métricas avanzadas

#### H9.4 — Logging Estructurado
- [ ] Migrar logs a formato estructurado (JSON)
- [ ] Agregar trace IDs por turno
- [ ] Integrar con sistema de observabilidad

**Entregable:** Logging estructurado

### Criterios de Aceptación H9
- ✅ Re-invocación asíncrona funciona
- ✅ Turn-window optimizado por canal
- ✅ Métricas avanzadas disponibles
- ✅ Logging estructurado implementado

---

## RESUMEN DE ENTREGABLES

### Documentación
- [ ] `docs/fluxcore/AUDIT_KERNEL_PROJECTORS.md`
- [ ] `docs/fluxcore/AUDIT_DATABASE_SCHEMA.md`
- [ ] `docs/fluxcore/AUDIT_RUNTIMES.md`
- [ ] `docs/fluxcore/AUDIT_FRONTEND.md`
- [ ] `docs/fluxcore/AUDIT_SERVICES_TOOLS.md`
- [ ] `docs/fluxcore/MIGRATION_STRATEGY.md`

### Migraciones SQL
- [ ] `0XX_cognition_queue.sql`
- [ ] `0XX_messages_signal_id_unique.sql`
- [ ] `0XX_fluxi_wes.sql`

### Servicios Core
- [ ] `apps/api/src/services/fluxcore/policy-context.service.ts`
- [ ] `apps/api/src/workers/cognition-worker.ts`
- [ ] `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- [ ] `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
- [ ] `apps/api/src/services/fluxcore/action-executor.service.ts`

### Runtimes
- [ ] `apps/api/src/services/runtimes/asistentes-local-runtime.adapter.ts`
- [ ] `apps/api/src/services/runtimes/fluxi-runtime.adapter.ts`
- [ ] `apps/api/src/services/runtimes/asistentes-openai-runtime.adapter.ts`

### Servicios Fluxi
- [ ] `apps/api/src/services/fluxi/wes-interpreter.service.ts`
- [ ] `apps/api/src/services/fluxi/work-engine.service.ts`
- [ ] `apps/api/src/services/fluxi/slot-resolver.service.ts`
- [ ] `apps/api/src/services/fluxi/semantic-context.service.ts`
- [ ] `apps/api/src/services/fluxi/external-effect-claim.service.ts`

### Tests
- [ ] `apps/api/src/core/projections/__tests__/`
- [ ] `apps/api/src/__tests__/integration/cognition-flow.test.ts`
- [ ] `apps/api/src/services/runtimes/__tests__/asistentes-local.test.ts`
- [ ] `apps/api/src/services/runtimes/__tests__/fluxi-runtime.test.ts`
- [ ] `apps/api/src/services/runtimes/__tests__/asistentes-openai.test.ts`

### Scripts
- [ ] `scripts/validate-projectors.ts`
- [ ] `scripts/validate-invariants.sql`

---

## CRONOGRAMA ESTIMADO

| Hito | Duración | Dependencias |
|------|----------|--------------|
| H0 — Auditoría | 3-5 días | Ninguna |
| H1 — Proyectores Atómicos | 5-7 días | H0 |
| H2 — Infraestructura Cognición | 7-10 días | H1 |
| H3 — Asistentes Local | 7-10 días | H2 |
| H4 — Fluxi/WES | 14-21 días | H3 |
| H5 — Asistentes OpenAI | 5-7 días | H3 |
| H6 — Activación | 3-5 días | H3, H4, H5 |
| H7 — Eliminación Legacy | 3-5 días | H6 |
| H8 — Herramientas | 5-7 días | H7 |
| H9 — Optimizaciones | 7-10 días | H8 |

**Total estimado:** 59-87 días (2-3 meses)

---

## CRITERIOS DE ÉXITO GLOBAL

### Técnicos
- ✅ Todos los invariantes del Canon se cumplen
- ✅ Tests de integración pasan al 100%
- ✅ Cobertura de tests > 80%
- ✅ Latencia P95 < 3 segundos
- ✅ Tasa de error < 0.1%
- ✅ Reconstruibilidad total desde Journal verificada

### Operacionales
- ✅ 100% de cuentas migradas sin incidentes
- ✅ Sistema legacy eliminado
- ✅ Dashboard de monitoreo operativo
- ✅ Documentación actualizada
- ✅ Equipo capacitado en nueva arquitectura

### De Negocio
- ✅ Ráfagas de mensajes producen una única respuesta
- ✅ No se pierden mensajes aunque el proceso muera
- ✅ No se duplican mensajes en replay
- ✅ Fluxi opera como decisor soberano
- ✅ Herramientas son extensibles sin modificar core

---

## NOTAS FINALES

1. **Coexistencia es crítica**: Nunca romper el sistema legacy hasta que el nuevo esté 100% validado
2. **Auditar antes de crear**: Maximizar reutilización de componentes existentes
3. **Probar cada hito**: No avanzar sin validar invariantes
4. **El Canon es ley**: Si el código contradice el Canon, el código está en error
5. **Documentar decisiones**: Registrar qué se reutiliza, qué se refactoriza y por qué
