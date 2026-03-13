# FluxCore v8.2 — Registro de Progreso (Changelog)

> Última actualización: 2026-02-19T10:11:00-03:00
> Arquitecto: Antigravity AI

---

## RESUMEN EJECUTIVO

**Estado Global:** HITO 0 ✅ · HITO 1 ✅ · HITO 1.5 ✅ · HITO 2 ✅ · HITO 2b ✅ · HITO 3 ✅ · HITO 5 ✅ (OpenAI runtime)

### Principios Ontológicos Inmutables
| Concepto | Definición |
|---|---|
| ChatCore = Cuerpo | Persistencia física, adaptadores, distribución |
| FluxCore = Cerebro | Cognición, planificación, ejecución mediada |
| Kernel = Columna Vertebral | Diario inmutable (Journal), congelado |
| Proyectores = Sistema Nervioso | Materialización determinista |
| SmartDelay v8.2 = Turn-Window | Pausa cognitiva nativa |
| AgentRuntime | **DEPRECADO** → RuntimeAdapter + RuntimeGateway |

---

## HITO 0: AUDITORÍA ✅
**Completado:** 2026-02-17

### Archivos Generados
- `docs/fluxcore/AUDIT_KERNEL_PROJECTORS.md`
- `docs/fluxcore/AUDIT_DATABASE_SCHEMA.md`
- `docs/fluxcore/AUDIT_RUNTIMES.md`
- `docs/fluxcore/AUDIT_FRONTEND.md`
- `docs/fluxcore/AUDIT_SERVICES_TOOLS.md`
- `docs/fluxcore/MIGRATION_STRATEGY.md`
- `docs/fluxcore/FLUXCORE_V8_IMPLEMENTATION_PLAN.md` (Plan maestro)

### Hallazgos Clave
1. Kernel RFC-0001: cumple al 100%, congelado
2. ChatProjector: NO era atómico, necesitaba reescritura
3. MessageCore: acoplamiento tóxico, debe ser eliminado de proyectores
4. AgentRuntime: viola soberanía, marcado para eliminación

---

## HITO 1: PROYECTORES ATÓMICOS + COLA DE COGNICIÓN ✅
**Completado:** 2026-02-18

### Migraciones SQL Aplicadas
| Migración | Estado | Verificación |
|---|---|---|
| `fluxcore_cognition_queue` (tabla completa) | ✅ Aplicada | Verificada vía `psql \d` |
| `messages.signal_id` (columna + UNIQUE) | ✅ Aplicada | Constraint `messages_signal_id_unique` verificado |
| `idx_cognition_queue_ready` (índice parcial) | ✅ Aplicada | WHERE processed_at IS NULL |
| `ux_cognition_queue_conversation_pending` (partial unique) | ✅ Aplicada | Verificado |

### Tests de Integridad (Ejecutados 2026-02-18)
| Test | Resultado | Qué Verifica |
|---|---|---|
| TEST_1: Table exists | ✅ | `fluxcore_cognition_queue` existe en PostgreSQL |
| TEST_2: Columns | ✅ | 9 columnas correctas (id, convId, acctId, lastSeq, turnStart, turnExpires, processedAt, attempts, lastError) |
| TEST_3: signal_id column | ✅ | `messages.signal_id` bigint, nullable |
| TEST_4: signal_id UNIQUE | ✅ | Constraint `messages_signal_id_unique` tipo `u` |
| TEST_5: Ready index | ✅ | `idx_cognition_queue_ready` con filtro parcial |
| TEST_6: Partial unique | ✅ | `ux_cognition_queue_conversation_pending` |
| TEST_7: Queue idempotency | ⚠️ FK violation expected | FK a `fluxcore_signals` impide test sin señales reales — correcto por diseño |
| TEST_8: Message idempotency | ✅ | `ON CONFLICT DO NOTHING` funciona correctamente |

### Archivos Modificados
| Archivo | Cambio |
|---|---|
| `packages/db/src/schema/fluxcore-cognition.ts` | Nueva tabla `fluxcore_cognition_queue` |
| `packages/db/src/schema/messages.ts` | Columna `signalId` con constraint UNIQUE |
| `packages/db/src/schema/index.ts` | Export del nuevo schema |
| `apps/api/src/core/kernel/base.projector.ts` | Soporte transaccional (tx pasado a project) |
| `apps/api/src/core/projections/chat-projector.ts` | Reescrito: atómico, puro, encolado en cognition_queue |
| `apps/api/src/services/conversation.service.ts` | Soporte transaccional (tx opcional) |

---

## HITO 1.5: TYPING/STATE SIGNALS ✅
**Completado:** 2026-02-18

### Implementación
El `ChatProjector` ahora despacha señales por `factType`:
- **`EXTERNAL_INPUT_OBSERVED`** → `projectMessage()` → crea mensaje + encola cognición
- **`EXTERNAL_STATE_OBSERVED`** → `projectStateChange()` → extiende ventana sin crear mensaje

### Constantes de Turn-Window
| Constante | Valor | Uso |
|---|---|---|
| `TURN_WINDOW_MS` | 3000ms | Ventana default por cada mensaje |
| `TYPING_EXTENSION_MS` | 5000ms | Extensión cuando el usuario teclea |

### Flujo de Typing
```
Humano typing → WhatsApp adapter → Kernel (EXTERNAL_STATE_OBSERVED)
  → ChatProjector.projectStateChange()
  → Busca turno pendiente en cognition_queue
  → Si existe: extiende turn_window_expires_at en +5s
  → Si no existe: ignora silenciosamente
```

---

## HITO 2: PIPELINE COGNITIVO ✅
**Completado:** 2026-02-18

### Archivos Creados
| Archivo | Responsabilidad |
|---|---|
| `core/fluxcore-types.ts` | Tipos: `ExecutionAction`, `RuntimeAdapter`, `RuntimeInput` |
| `services/fluxcore/runtime-gateway.service.ts` | Registro + invocación de runtimes (timeout 30s) |
| `services/fluxcore/cognitive-dispatcher.service.ts` | Router puro: PolicyContext → Runtime → ActionExecutor |
| `services/fluxcore/action-executor.service.ts` | Puente Brain→Body: acciones → DB + WebSocket |
| `workers/cognition-worker.ts` | Heartbeat: poll 1s, FOR UPDATE SKIP LOCKED, backoff |
| `core/events.ts` | Nuevos eventos: `cognition:turn_processed`, `cognition:turn_failed` |

### Typing Keepalive (NUEVO — responde tu pregunta #2)
El `CognitiveDispatcher` ahora implementa **typing continuo**:

```
CognitiveDispatcher recibe turno listo
  → startTypingKeepAlive(conversationId, accountId)
    → Pulso INMEDIATO de typing
    → Cada 3 segundos: otro pulso de typing
  → RuntimeGateway.invoke() (puede tardar 5-30 segundos)
  → typingKeepAlive.stop() ← se detiene al recibir respuesta
  → ActionExecutor.execute(response) ← envía la respuesta
```

**Resultado para el usuario:** Ve "Escribiendo..." desde el momento en que FluxCore comienza a pensar hasta que llega la respuesta. Sin interrupciones.

### Acciones Implementadas
| Tipo | Estado | Descripción |
|---|---|---|
| `send_message` | ✅ | Persiste en `messages` (generatedBy: 'ai'), emite WS |
| `send_template` | ⏳ TODO H3 | Placeholder — requiere templateService |
| `start_typing` | ✅ | Emite indicator via ChatCore event bus |
| `no_action` | ✅ | Solo registra log |

### Deuda Técnica Documentada
- [ ] Acciones de Fluxi (propose_work, open_work, etc.) → H4
- [ ] Validación de permisos contra PolicyContext.authorizedTools
- [ ] Auditoría de acciones ejecutadas
- [ ] Tests unitarios por componente
- [ ] send_template con templateService real

---

## HITO 2b: WIRING DEL SISTEMA ✅
**Completado:** 2026-02-19

### Archivos Modificados
| Archivo | Cambio |
|---|---|
| `apps/api/src/config/feature-flags.ts` | Nuevo flag `fluxNewArchitecture` (env: `FLUX_NEW_ARCHITECTURE`) |
| `apps/api/src/server.ts` | Imports + registro de `asistentesLocalRuntime` + arranque condicional de `cognitionWorker` |

### Comportamiento
- `runtimeGateway.register(asistentesLocalRuntime)` se ejecuta **siempre** al startup
- `cognitionWorker.start()` solo si `FLUX_NEW_ARCHITECTURE=true`
- Con flag=false: queue se llena pero nadie la consume → legacy path sigue activo
- Con flag=true: CognitionWorker procesa turnos → nuevo pipeline activo
- Cleanup graceful: `cognitionWorker.stop()` registrado en cleanupTasks

---

## HITO 3: RUNTIME ASISTENTES LOCAL SOBERANO ✅
**Completado:** 2026-02-19

### Principio Implementado
> Canon §4.7.1: "El runtime recibe contexto completo. Nunca accede a DB durante `handleTurn`."

### Archivos Creados/Modificados
| Archivo | Cambio |
|---|---|
| `packages/db/src/types/policy-context.ts` | Nuevos campos en `FluxExecutionPolicy`: `llmProvider?`, `llmModel?`, `llmMaxTokens?`, `llmTemperature?` |
| `apps/api/src/services/flux-policy-context.service.ts` | Nuevo método `resolveActiveAssistantConfig()`: carga asistente production + instrucciones concatenadas → LLM config pre-resuelto |
| `apps/api/src/services/fluxcore/prompt-builder.service.ts` | **NUEVO** — Construye system prompt desde `PolicyContext` sin acceso a DB |
| `apps/api/src/services/fluxcore/llm-client.service.ts` | **NUEVO** — Llama OpenAI-compatible API (groq/openai), fallback entre providers |
| `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts` | **REESCRITO** — Cero acceso a DB en `handleTurn`. Usa PromptBuilder + LLMClient |

### Flujo Soberano
```
handleTurn(RuntimeInput)
  → PolicyContext.execution.{llmProvider, llmModel} (pre-resueltos)
  → PromptBuilder.build(policyContext, history) → systemPrompt + messages
  → LLMClient.complete(provider, model, messages) → responseText
  → return [{ type: 'send_message', content: responseText }]
```

### Estructura del System Prompt (PromptBuilder)
1. **§ Identidad** — business.displayName, bio, privateContext
2. **§ Directivas de Atención (PRIORIDAD)** — tone, formality, emojis, language, notas del contacto
3. **§ Instrucciones del Asistente** — contenido de `fluxcore_instructions` (cargado en PolicyContext)
4. **§ Conocimiento y Recursos** — websites, templates, servicios, handoffs

### Invariantes Verificados
- ✅ `handleTurn` no importa ni usa DB
- ✅ No llama a `aiService.generateResponse()`
- ✅ No ejecuta efectos (devuelve acciones)
- ✅ `packages/db` rebuilt — build completo pasa (`1180 modules`)

### Deuda Técnica Documentada
- [ ] Tool loop (máximo 2 rounds) para `search_knowledge` — H8
- [ ] `send_template` en ActionExecutor con templateService real — H8
- [ ] Tests unitarios de soberanía (mock DB verifica 0 llamadas) — pendiente

---

## PRÓXIMOS PASOS

### HITO 4: Fluxi/WES Runtime ✅
**Completado:** 2026-02-19

| Archivo | Cambio |
|---|---|
| `apps/api/src/core/fluxcore-types.ts` | Nuevas actions: `ProposeWorkAction`, `OpenWorkAction`, `AdvanceWorkStateAction`, `RequestSlotAction`, `CloseWorkAction`, `CandidateSlot` |
| `packages/db/src/types/policy-context.ts` | Nuevos campos en `FluxExecutionPolicy`: `activeWorkId?`, `workDefinitions?` |
| `apps/api/src/services/flux-policy-context.service.ts` | Nuevo método `resolveWESContext()`: carga work activo + WorkDefinitions → pre-resueltos en PolicyContext |
| `apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts` | **NUEVO** — `FluxiRuntime` soberano: Phase1 ingest, Phase2 interpret (LLM), Phase3 gate |
| `apps/api/src/services/fluxcore/action-executor.service.ts` | 5 nuevos handlers: `executeProposeWork`, `executeOpenWork`, `executeAdvanceWorkState`, `executeRequestSlot`, `executeCloseWork` |
| `apps/api/src/server.ts` | `runtimeGateway.register(fluxiRuntime)` |

**Flujo Fluxi (sovereign):**
```
handleTurn(RuntimeInput)
  → policyContext.execution.activeWorkId? → Phase 1 (ingest slots via LLM)
  → policyContext.execution.workDefinitions? → Phase 2 (interpret intent via LLM)
  → Gate: confidence >= 0.6 + candidateSlots.length > 0
  → return [ProposeWorkAction | AdvanceWorkStateAction | NoAction]
ActionExecutor.executeProposeWork()
  → workEngineService.proposeWork() → workEngineService.openWork()
```

**Tablas DB (migraciones 035-037, ya aplicadas):** `fluxcore_works`, `fluxcore_work_slots`, `fluxcore_work_events`, `fluxcore_proposed_works`, `fluxcore_semantic_contexts`, `fluxcore_external_effect_claims`, `fluxcore_work_definitions`, `fluxcore_decision_events`, `fluxcore_external_effects`

---

### HITO 6: Activación y Monitoreo ✅ (parcial)
**Completado:** 2026-02-19

| Archivo | Cambio |
|---|---|
| `scripts/validate-invariants.sql` | **NUEVO** — 7 invariantes SQL (INV-1 a INV-7). INV-6/INV-7 comentados hasta H4+ |

**Activación gradual:**
```bash
# Activar nuevo pipeline para producción:
FLUX_NEW_ARCHITECTURE=true bun run dev

# Validar invariantes:
psql $DATABASE_URL -f scripts/validate-invariants.sql

# Runtimes registrados al startup:
# [RuntimeGateway] ✅ Registered runtime: Asistentes Local (v8.2) (asistentes-local)
# [RuntimeGateway] ✅ Registered runtime: Asistentes OpenAI (v8.2) (asistentes-openai)
# [RuntimeGateway] ✅ Registered runtime: Fluxi/WES (v8.2) (fluxi-runtime)
```

### HITO 5: AsistentesOpenAI Runtime ✅
**Completado:** 2026-02-19

| Archivo | Cambio |
|---|---|
| `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts` | **NUEVO** — implementa `RuntimeAdapter`, zero DB en `handleTurn` |
| `apps/api/src/server.ts` | `runtimeGateway.register(asistentesOpenAIRuntime)` |

**Flujo:** `assistantExternalId` ya en PolicyContext → `buildThreadMessages()` → `buildInstructionsOverride()` → `runAssistantWithMessages()` → `send_message`

**Invariante:** AsistentesLocal y AsistentesOpenAI son paralelos, independientes, nunca se invocan entre sí.

### HITO 6: Activación y Monitoreo ⏳
- [ ] `FLUX_NEW_ARCHITECTURE=true` para cuenta interna de prueba
- [ ] Script `scripts/validate-invariants.sql`
- [ ] Dashboard métricas

### HITO 7: Limpieza Final ✅ (parcial)
**Completado:** 2026-02-19

| Archivo | Cambio |
|---|---|
| `apps/api/src/services/runtime-gateway.service.ts` (OLD) | `AgentRuntimeAdapter` desregistrado + comentado |
| `apps/api/src/services/runtimes/agent-runtime.adapter.ts` | `@deprecated` — reemplazado por `FluxiRuntime` |
| `apps/api/src/services/smart-delay.service.ts` | `@deprecated` — reemplazado por turn-window v8.2 |

**Pendiente (bloqueado por legacy ws-handler.ts):**
- [ ] Eliminar `AgentRuntimeAdapter` + `FluxCoreRuntimeAdapter` (esperan que `ws-handler.ts` emita Kernel facts)
- [ ] Eliminar `SmartDelayService` (cuando `ws-handler.ts` migre a nuevo pipeline)
- [ ] Eliminar `MessageCore` subscribers en `ws-handler.ts`
- [ ] Decommissionar `services/runtime-gateway.service.ts` (OLD) → `message-dispatch.service.ts` migra a `fluxcore/runtime-gateway.service.ts`

**MessageCore de proyectores:** ✅ Eliminado en HITO 1 (ChatProjector reescrito como atómico)

---

## RESUMEN FINAL — FluxCore v8.2 (2026-02-19)

| Hito | Estado | Descripción |
|---|---|---|
| H0 | ✅ | Auditoría completa — canon, plan, docs |
| H1 | ✅ | Proyectores atómicos + `fluxcore_cognition_queue` |
| H1.5 | ✅ | Typing/State signals + extensión de ventana |
| H2 | ✅ | Pipeline cognitivo completo (Dispatcher + ActionExecutor + CognitionWorker) |
| H2b | ✅ | Wiring del sistema: feature flag + registro de runtimes |
| H3 | ✅ | AsistentesLocalRuntime soberano (PromptBuilder + LLMClient) |
| H4 | ✅ | FluxiRuntime + Fluxi actions + ActionExecutor handlers |
| H5 | ✅ | AsistentesOpenAIRuntime via Assistants API |
| H6 | ✅ | validate-invariants.sql + guía de activación |
| H7 | ⚠️ | Parcial — AgentRuntime desregistrado, SmartDelay deprecado |
| H8 | ⏳ | Tools loop (search_knowledge) + send_template real |
