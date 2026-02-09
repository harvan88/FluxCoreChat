# FluxCore Runtime — Análisis Arquitectónico Completo

**Fecha:** 2026-02-09  
**Alcance:** Todo el runtime de IA: orquestación, extensión, ejecución, RAG, tools, créditos  
**Veredicto general:** Funcional pero con deuda técnica significativa. No es enterprise-ready. No soporta multi-agente.

---

## 1. ARQUITECTURA ACTUAL — FLUJO COMPLETO DE UN MENSAJE

```
Usuario envía mensaje
       │
       ▼
  MessageCore.receive()          ← core/message-core.ts
       │
       ├─ 1. Persistir mensaje (DB)
       ├─ 2. WebSocket broadcast
       ├─ 3. AutomationController.evaluateTrigger()
       ├─ 4. ExtensionHost.processMessage()  ← NO genera IA aquí
       └─ 5. CoreEventBus.emit('core:message_received')
                    │
                    ▼
           AIOrchestrator         ← ai-orchestrator.service.ts
                    │
                    ├─ Validaciones (success, automatic mode, text)
                    ├─ Debounce por conversación (setTimeout)
                    └─ extensionHost.generateAIResponse()
                              │
                              ▼
                    AIService.generateResponse()   ← ai.service.ts
                              │
                    ┌─────────┤
                    ▼         │
          resolveExecutionPlan()     ← ai-execution-plan.service.ts
                    │
                    ├─ resolveActiveAssistant()
                    ├─ Check extension_installations
                    ├─ Extract modelConfig/timingConfig
                    ├─ Check entitlements
                    ├─ Check API keys
                    ├─ Credits gating (OpenAI)
                    └─ Build providerOrder
                              │
                    ┌─────────┤
                    ▼         │
             runtime === 'openai'?
                /           \
               SI            NO
               │              │
     executeOpenAIAssistantsPath()    extension.generateSuggestion()
               │                              │
               ▼                              ▼
     runAssistantWithMessages()      FluxCoreExtension (local)
     (openai-sync.service.ts)        (extensions/fluxcore/src/index.ts)
               │                              │
               │                    ┌─────────┤
               │                    ▼         │
               │          fetchActiveAssistant() ← HTTP a localhost:3000
               │          buildPrompt()
               │          getToolsForAssistant()
               │          createChatCompletionWithFallback()
               │                    │
               │                    ├─ Tool loop (max 2 rounds)
               │                    │   ├─ search_knowledge
               │                    │   ├─ list_available_templates
               │                    │   └─ send_template
               │                    │
               │                    └─ Build AISuggestion
               │                              │
               └──────────────────────────────┤
                                              ▼
                                   AIOrchestrator
                                   messageCore.send() ← respuesta final
```

---

## 2. LO QUE ESTÁ BIEN (Aciertos)

### 2.1 ExecutionPlan como Single Source of Truth
El patrón `resolveExecutionPlan()` es sólido. Resuelve assistant, provider, créditos y elegibilidad en **un solo paso** antes de tocar la extensión. Discriminated union (`EligiblePlan | BlockedPlan`) es tipado correcto.

### 2.2 CoreEventBus + AIOrchestrator desacoplados
El core de mensajería NO conoce la IA. Emite un evento (`core:message_received`) y el orchestrator escucha. Esto respeta TOTEM (IA es extensión, no núcleo).

### 2.3 RAG-as-Tool
El modelo decide si buscar en la base de conocimiento vía function calling (`search_knowledge`). Elimina búsquedas innecesarias para mensajes como "ok", "gracias". Buena decisión arquitectónica.

### 2.4 ToolRegistry extensible
El `ToolRegistry` en la extensión es un patrón limpio: recibe dependencias por inyección, decide qué tools ofrecer según el contexto del asistente.

### 2.5 Provider fallback con retry
`createChatCompletionWithFallback()` implementa retry con exponential backoff, mapeo de modelos entre providers, y fallback automático de tools si causan `bad_request`.

### 2.6 Trace/Debug completo
Cada ejecución genera un `AITraceEntry` con attempts, tool usage, request bodies, timing. Útil para debugging en producción.

---

## 3. FALLAS CRÍTICAS

### 3.1 🔴 Código muerto: `processMessage()` duplica `generateResponse()`
`ai.service.ts` tiene **dos métodos** que hacen casi lo mismo:
- `processMessage()` (líneas 235-546) — Lógica legacy, resuelve assistant manualmente, usa `applyCreditsGating()` (degradación silenciosa)
- `generateResponse()` (líneas 1279-1372) — Usa `ExecutionPlan`, es el flujo correcto

**`processMessage()` es dead code** que nadie llama actualmente (el orchestrator usa `generateResponse`), pero sigue ahí con ~300 líneas, confundiendo a cualquier desarrollador nuevo.

### 3.2 🔴 La extensión se llama a sí misma via HTTP
```typescript
// extensions/fluxcore/src/index.ts:219
const url = `http://localhost:${port}/fluxcore/runtime/active-assistant?accountId=${accountId}`;
const response = await fetch(url);
```

La extensión FluxCore hace **HTTP calls a localhost** para obtener el assistant composition, RAG context, templates, etc. Esto es:
- **Ineficiente**: Serialización JSON → HTTP → Parsing → Routing → DB → Serialización → Response
- **Frágil**: Depende de que el puerto sea correcto, de que el server esté levantado
- **Circular**: El API server carga la extensión, la extensión le hace requests al API server

Debería recibir esta data por inyección de dependencias o parámetro.

### 3.3 🔴 Doble resolución del assistant
Cuando el orchestrator llama a `generateResponse()`:
1. `resolveExecutionPlan()` llama a `resolveActiveAssistant()` → DB query completa
2. Luego `extension.generateSuggestion()` hace **otra** llamada `fetchActiveAssistant()` via HTTP → que internamente hace la misma query

El assistant se resuelve **2 veces** por mensaje. Antes era 3x (se arregló parcialmente).

### 3.4 🔴 `ai.service.ts` es un God Object (1596 líneas)
Este archivo concentra:
- Carga de la extensión FluxCore
- Gestión de suggestions (CRUD en memoria)
- Branding/promo markers
- Provider resolution
- API key management
- Context building
- Trace management
- WebSocket emission
- Credits gating (legacy)
- Welcome conversations
- OpenAI Assistants path
- Local runtime path

Debería ser 5-6 servicios separados.

### 3.5 🔴 Config mutation en lugar de inmutabilidad
```typescript
// extensions/fluxcore/src/index.ts:377
Object.assign(this.config, newConfig);
```
`onConfigChange()` muta el singleton de la extensión. Si dos cuentas distintas procesan mensajes concurrentemente, la segunda llamada a `onConfigChange()` sobreescribe la config de la primera **antes** de que termine `generateSuggestion()`. Esto es un **race condition** en producción con múltiples cuentas.

### 3.6 🔴 Logging excesivo en producción
Hay ~80+ `console.log()` en `ai.service.ts` y ~40+ en `extensions/fluxcore/src/index.ts`. En producción esto genera ruido masivo. No hay niveles de log (debug vs info vs warn).

### 3.7 🟡 Tipos `any` por doquier
```typescript
type ContextData = any;  // ai.service.ts:50
```
El tipo de contexto es `any` en el servicio principal. Los cast `as any` se usan extensivamente para bypasear TypeScript.

---

## 4. PUNTOS CRÍTICOS (Riesgos)

### 4.1 Single-threaded bottleneck
Todo corre en un solo proceso Bun. Si una llamada a OpenAI tarda 15 segundos, bloquea el event loop para todos los demás usuarios. No hay worker threads ni queue system.

### 4.2 Suggestions en memoria (no persisten)
```typescript
const suggestions: Map<string, AISuggestion> = new Map();
```
Si el server se reinicia, se pierden todas las suggestions pendientes y traces.

### 4.3 Sin rate limiting por cuenta
No hay protección contra un usuario que envíe 100 mensajes en 1 segundo. El debounce del orchestrator solo agrupa mensajes de la misma conversación, pero no limita el throughput global.

### 4.4 Sin circuit breaker
Si OpenAI está caído, el sistema va a reintentar indefinidamente (hasta el timeout de 15s) por cada mensaje. No hay circuit breaker que detenga los intentos después de N fallos consecutivos.

---

## 5. ¿ES ENTERPRISE-READY?

**No.** Faltan estos pilares enterprise:

| Pilar | Estado actual | Necesario |
|-------|--------------|-----------|
| **Multi-tenancy isolation** | Config mutada en singleton compartido | Config per-request, inmutable |
| **Horizontal scaling** | Single process, state en memoria | Stateless workers + Redis/queue |
| **Observability** | console.log | Structured logging, OpenTelemetry, metrics |
| **Fault tolerance** | Sin circuit breaker, sin retry queue | Circuit breakers, dead letter queues |
| **Security** | API keys en env vars compartidas | Per-tenant key vault, key rotation |
| **Rate limiting** | Ninguno | Per-account, per-provider throttling |
| **Audit trail** | Traces en memoria | Traces persistidos, compliance-ready |
| **A/B testing** | Ninguno | Feature flags, canary deployments |
| **Multi-agent** | ❌ No existe | Orchestration layer, agent graphs |

---

## 6. ¿ESTÁ PREPARADO PARA HACER LOS MEJORES AGENTES?

**No.** El sistema actual es un **single-agent monolítico**. Un asistente recibe un mensaje, genera una respuesta. No hay:

- **No hay composición de agentes**: No se puede crear un pipeline donde Agent A analiza la intención, Agent B busca información, Agent C formula la respuesta
- **No hay routing inteligente**: No hay un "router agent" que decida qué sub-agente usar
- **No hay estado de conversación multi-step**: No hay memoria de working state entre turnos (solo el historial de mensajes crudos)
- **No hay ejecución determinista**: Todo depende del LLM. No hay steps deterministas intercalados
- **No hay grafos de ejecución**: No se puede definir "si el usuario pide X, ejecutar workflow Y con steps [A→B→C]"
- **No hay evaluación de calidad**: No hay self-critique, no hay verificación de output

---

## 7. PROPUESTA: ARQUITECTURA MICRO-AGENTES

### 7.1 Concepto: Agent Graph + Deterministic Steps

```
                    ┌─────────────────────────┐
                    │     Agent Orchestrator    │
                    │  (Deterministic Router)   │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Intent    │  │ Knowledge│  │ Action   │
        │ Classifier│  │ Agent    │  │ Executor │
        │ (LLM)     │  │ (RAG)    │  │ (Tools)  │
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Response  │  │ Quality  │  │ Guard    │
        │ Generator │  │ Checker  │  │ Rails    │
        │ (LLM)     │  │ (Det.)   │  │ (Det.)   │
        └──────────┘  └──────────┘  └──────────┘
```

### 7.2 Definición de un Agent Flow (JSON)

Un asistente autorizado podría crear un flujo desde un JSON como este:

```json
{
  "id": "customer-support-flow",
  "name": "Soporte al Cliente",
  "version": "1.0",
  "trigger": { "type": "message_received" },
  "agents": [
    {
      "id": "intent-classifier",
      "type": "llm",
      "model": "llama-3.1-8b-instant",
      "systemPrompt": "Clasifica la intención del usuario en: pregunta_producto, queja, saludo, otro",
      "outputSchema": {
        "type": "object",
        "properties": {
          "intent": { "enum": ["pregunta_producto", "queja", "saludo", "otro"] },
          "confidence": { "type": "number" },
          "entities": { "type": "object" }
        }
      },
      "maxTokens": 100,
      "temperature": 0.1
    },
    {
      "id": "knowledge-lookup",
      "type": "rag",
      "condition": "{{ intent-classifier.intent == 'pregunta_producto' }}",
      "vectorStoreIds": ["vs_productos"],
      "topK": 5,
      "minScore": 0.3
    },
    {
      "id": "response-generator",
      "type": "llm",
      "model": "gpt-4o-mini",
      "systemPrompt": "Genera una respuesta usando el contexto proporcionado...",
      "inputs": {
        "user_message": "{{ trigger.content }}",
        "intent": "{{ intent-classifier.intent }}",
        "knowledge": "{{ knowledge-lookup.context }}",
        "customer_history": "{{ context.relationship }}"
      },
      "maxTokens": 500,
      "temperature": 0.7
    },
    {
      "id": "quality-gate",
      "type": "deterministic",
      "checks": [
        { "rule": "response.length > 10", "action": "pass" },
        { "rule": "response.contains_pii", "action": "redact" },
        { "rule": "confidence < 0.5", "action": "escalate_to_human" }
      ]
    },
    {
      "id": "send-template",
      "type": "tool",
      "condition": "{{ intent-classifier.intent == 'queja' && quality-gate.action == 'pass' }}",
      "tool": "send_template",
      "params": {
        "templateId": "complaint-acknowledgment",
        "variables": { "name": "{{ context.relationship.contactName }}" }
      }
    }
  ],
  "scopes": {
    "allowedModels": ["llama-3.1-8b-instant", "gpt-4o-mini"],
    "maxTotalTokens": 2000,
    "maxExecutionTimeMs": 30000,
    "allowedTools": ["search_knowledge", "send_template"],
    "canCreateSubAgents": false
  }
}
```

### 7.3 Qué se necesita construir

#### Capa 1: Agent Runtime Engine
```
apps/api/src/services/agent-runtime/
├── engine.ts              — Ejecuta un AgentFlow (graph walker)
├── agent-types.ts         — LLMAgent, RAGAgent, DeterministicAgent, ToolAgent
├── context-bus.ts         — Shared context entre agents (inmutable, append-only)
├── condition-evaluator.ts — Evalúa expresiones tipo {{ intent == 'x' }}
├── scope-enforcer.ts      — Valida límites (tokens, tiempo, tools)
└── flow-registry.ts       — CRUD de AgentFlows (DB-backed)
```

#### Capa 2: Agent Types

| Tipo | Comportamiento | Determinista? |
|------|---------------|---------------|
| `llm` | Llama a un LLM con system prompt + inputs | No |
| `rag` | Busca en vector stores | Semi (query es del paso anterior) |
| `deterministic` | Reglas if/then/else | Sí |
| `tool` | Ejecuta una tool registrada | Sí |
| `router` | Decide qué branch del grafo seguir | Configurable |
| `human-in-loop` | Pausa y espera aprobación humana | Sí |
| `transform` | Transforma data (map, filter, extract) | Sí |

#### Capa 3: Scoped Execution
Cada flow se ejecuta dentro de un **scope** que define:
- Qué modelos puede usar
- Cuántos tokens puede consumir
- Qué tools puede invocar
- Tiempo máximo de ejecución
- Si puede crear sub-flujos

Esto permite que un asistente autorizado cree flujos sin riesgo de escalada de privilegios.

---

## 8. SIMPLIFICACIÓN INMEDIATA DEL CÓDIGO ACTUAL

### 8.1 Eliminar dead code
- **Borrar `processMessage()`** de `ai.service.ts` (~300 líneas)
- **Borrar `applyCreditsGating()`** — ya lo hace `resolveExecutionPlan`
- **Borrar `getAccountConfig()` completo** — duplica lógica del ExecutionPlan

### 8.2 Eliminar HTTP self-calls en la extensión
En lugar de que la extensión haga `fetch(localhost:3000/...)`, pasar la data como parámetro:

```typescript
// ANTES (malo):
const active = await this.fetchActiveAssistant(recipientAccountId); // HTTP call

// DESPUÉS (bueno):
async generateSuggestion(event, context, recipientAccountId, composition) {
  // composition ya viene resuelta del ExecutionPlan
}
```

Esto elimina ~4 HTTP round-trips por mensaje.

### 8.3 Config inmutable per-request
```typescript
// ANTES (race condition):
await extension.onConfigChange(recipientAccountId, { ... });
const suggestion = await extension.generateSuggestion(event, context, recipientAccountId);

// DESPUÉS (seguro):
const suggestion = await extension.generateSuggestion(event, context, {
  accountId: recipientAccountId,
  config: { model, temperature, providerOrder, ... },  // inmutable per-request
  composition,  // ya resuelto
});
```

### 8.4 Descomponer ai.service.ts
```
ai.service.ts (1596 líneas) →
├── ai-generation.service.ts    — generateResponse() + OpenAI path
├── ai-context.service.ts       — buildContext()
├── ai-branding.service.ts      — promo markers, branding footer
├── ai-suggestion-store.ts      — CRUD suggestions (migrar a Redis)
└── ai-trace.service.ts         — listTraces, getTrace, exportTraces
```

### 8.5 Structured logging
Reemplazar `console.log('[ai-service] ...')` con:
```typescript
import { logger } from '../utils/logger';
logger.info('generateResponse', { accountId, runtime, provider, elapsedMs });
logger.debug('providerOrder', { providers: providerOrder.map(p => p.provider) });
```

---

## 9. ROADMAP PROPUESTO

### Fase 1: Limpieza (1-2 semanas)
- [ ] Eliminar `processMessage()` dead code
- [ ] Eliminar HTTP self-calls en extensión
- [ ] Config inmutable per-request (fix race condition)
- [ ] Descomponer `ai.service.ts`
- [ ] Structured logging

### Fase 2: Foundations (2-3 semanas)
- [ ] Persistir traces en DB (no en memoria)
- [ ] Persistir suggestions en DB/Redis
- [ ] Rate limiting per-account
- [ ] Circuit breaker para providers
- [ ] Agent Flow schema + DB table

### Fase 3: Agent Runtime Engine (3-4 semanas)
- [ ] Engine básico (sequential graph walker)
- [ ] Agent types: LLM, RAG, Deterministic, Tool
- [ ] Context bus (shared state entre agents)
- [ ] Condition evaluator
- [ ] Scope enforcer

### Fase 4: Multi-Agent Features (3-4 semanas)
- [ ] Router agent (intent classification → branch)
- [ ] Parallel execution (agents independientes en paralelo)
- [ ] Human-in-the-loop (pausa, notificación, aprobación)
- [ ] Agent Flow editor (UI visual)
- [ ] JSON-to-Flow API (crear flujos desde configuración)

### Fase 5: Enterprise (ongoing)
- [ ] OpenTelemetry integration
- [ ] Per-tenant API key management
- [ ] A/B testing de flujos
- [ ] Agent quality metrics
- [ ] Self-improvement loops

---

## 10. RESUMEN EJECUTIVO

| Pregunta | Respuesta |
|----------|-----------|
| ¿Funciona? | Sí, para single-agent simple |
| ¿Es enterprise? | No. Race conditions, sin scaling, sin observability |
| ¿Puede hacer los mejores agentes? | No. Es single-agent monolítico |
| ¿Se puede simplificar? | Sí. ~500 líneas de dead code, HTTP self-calls innecesarios |
| ¿Se puede crear flujos desde JSON? | No hoy. Requiere Agent Runtime Engine (Fase 3) |
| ¿Qué falta más urgente? | Fix race condition de config + eliminar dead code + eliminar HTTP self-calls |

**El código actual tiene buenos cimientos** (EventBus, ExecutionPlan, ToolRegistry, RAG-as-Tool) pero necesita una limpieza profunda antes de construir la capa de multi-agente encima.
