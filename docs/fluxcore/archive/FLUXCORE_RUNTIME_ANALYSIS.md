# FluxCore Runtime — Análisis Arquitectónico Completo

**Fecha:** 2026-02-09 (actualizado tras Fase 1 Limpieza)  
**Alcance:** Todo el runtime de IA: orquestación, extensión, ejecución, RAG, tools, créditos  
**Veredicto general:** Funcional, deuda técnica reducida tras Fase 1. No es enterprise-ready aún. No soporta multi-agente.

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
               │                              |
               |                    ┌─────────┤
               |                    ▼         |
               |          fetchActiveAssistant() ← RuntimeServices (inyección directa)
               |          buildPrompt()
               |          getToolsForAssistant()
               |          createChatCompletionWithFallback(config)
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

### 3.1 ✅ ~~Código muerto: `processMessage()` duplica `generateResponse()`~~ **RESUELTO**

> Eliminado en Fase 1. Se borraron `processMessage()` (~310 líneas), `applyCreditsGating()` (~65 líneas) e imports no usados. `getAccountConfig()` se mantuvo temporalmente (tiene callers vivos: `getAutoReplyDelayMs`, `getStatusForAccount`).

### 3.2 ✅ ~~La extensión se llama a sí misma via HTTP~~ **RESUELTO**

> Eliminado en Fase 1. Se implementó `RuntimeServices` injection: `ai.service.ts` inyecta `resolveActiveAssistant`, `fetchRagContext`, `listTemplates`, `sendTemplate` directamente en la extensión via `setRuntimeServices()`. Los 4 métodos HTTP (`fetchActiveAssistant`, `listAuthorizedTemplates`, `sendTemplateTool`, `fetchRAGContext`) ahora usan los servicios inyectados con fallback HTTP para backward compatibility.

### 3.3 � Doble resolución del assistant (parcialmente resuelto)
Cuando el orchestrator llama a `generateResponse()`:
1. `resolveExecutionPlan()` llama a `resolveActiveAssistant()` → DB query completa
2. Luego `extension.generateSuggestion()` llama `fetchActiveAssistant()` → ahora via servicio inyectado (sin HTTP), pero sigue siendo una segunda query

> **Mejora en Fase 1:** Ya no hay HTTP round-trip, pero la doble query a DB persiste. Optimización futura: pasar la composition ya resuelta como parámetro.

### 3.4 ✅ ~~`ai.service.ts` es un God Object (1596 líneas)~~ **RESUELTO**

> Descompuesto en Fase 1 usando Extract & Delegate:
> - `ai-branding.service.ts` — funciones puras de branding/promo
> - `ai-suggestion-store.ts` — CRUD de suggestions en memoria
> - `ai-trace.service.ts` — delegación de traces a la extensión
> - `ai-context.service.ts` — buildContext() (queries DB)
> - `ai.service.ts` ahora es un orquestador delgado (~1070 líneas) que delega a los servicios extraídos. La API pública no cambió.

### 3.5 ✅ ~~Config mutation en lugar de inmutabilidad~~ **RESUELTO**

> Corregido en Fase 1. `generateSuggestion()` ahora acepta `configOverride?: FluxCoreConfig` como 4to parámetro. `ai.service.ts` pasa `requestConfig` desde el ExecutionPlan directamente — ya no llama `onConfigChange()`. `getProviderOrder()` y `createChatCompletionWithFallback()` también reciben config por parámetro. El singleton ya no muta estado entre requests concurrentes.

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

## 9. ROADMAP PROPUESTO — CON ANÁLISIS DE RIESGOS

---

### Fase 1: Limpieza (1-2 semanas) ✅ COMPLETADA 2026-02-09

#### 1.1 Eliminar `processMessage()` dead code

**¿Podría romper algo?** → **NO.** Verificado por grep exhaustivo del codebase:

- `aiService.processMessage()` (líneas 235-546 de `ai.service.ts`) **no es invocado por ningún archivo**.
- La única referencia es un **comentario** en `ai-execution-plan.service.ts` línea 11.
- El AIOrchestrator usa `extensionHost.generateAIResponse()` → `aiService.generateResponse()`. Nunca pasa por `processMessage()`.
- **OJO**: `extensionHost.processMessage()` (en `extension-host.service.ts`) es un método **distinto** que SÍ se usa — procesa hooks de extensiones. No confundir.

**Qué borrar exactamente:**
- `ai.service.ts` → método `processMessage()` (~310 líneas)
- `ai.service.ts` → método `applyCreditsGating()` (~65 líneas) — ya lo hace `resolveExecutionPlan`
- `ai.service.ts` → método `getAccountConfig()` (~140 líneas) — duplica lógica del ExecutionPlan

**Total a eliminar:** ~515 líneas de dead code. Cero riesgo funcional.

#### 1.2 Eliminar HTTP self-calls en extensión

**¿Podría romper algo?** → **SÍ, si se hace mal.** Requiere cuidado pero es seguro si se sigue el patrón correcto.

La extensión FluxCore hace **4 HTTP round-trips a localhost** por mensaje:

| Método | Ruta | Tipo |
|--------|------|------|
| `fetchActiveAssistant()` | `GET /fluxcore/runtime/active-assistant` | Lectura de datos |
| `listAuthorizedTemplates()` | `POST /fluxcore/runtime/tools/list-templates` | Lectura de datos |
| `sendTemplateTool()` | `POST /fluxcore/runtime/tools/send-template` | **Efecto secundario** (envía mensaje) |
| `fetchRAGContext()` | `POST /fluxcore/runtime/rag-context` | Lectura de datos |

**Sobre la cuenta de FluxCore:** La cuenta `@fluxcore` que chatea con usuarios opera a través del flujo normal de `MessageCore.receive()` → `coreEventBus.emit()` → `AIOrchestrator`. Los HTTP self-calls son internos a la extensión para obtener data del API server que la hospeda. Eliminar los self-calls **NO afecta** la cuenta `@fluxcore` ni su capacidad de chatear.

**Cómo migrar sin romper:**

```typescript
// 1. fetchActiveAssistant() → Ya viene en el ExecutionPlan
//    resolveExecutionPlan() ya llama resolveActiveAssistant() y devuelve composition
//    Solo hay que pasar composition como parámetro a generateSuggestion()

// 2. fetchRAGContext() → Inyectar el servicio directo
//    En vez de HTTP, importar el servicio de RAG y llamarlo in-process

// 3. listAuthorizedTemplates() → Inyectar template-registry.service
//    Ya existe templateRegistryService, solo inyectarlo

// 4. sendTemplateTool() → CUIDADO: este tiene efecto secundario
//    Necesita acceso al messageCore para enviar el template
//    Solución: pasar un callback/servicio por inyección al ToolRegistry
```

**El único riesgo real** es `sendTemplateTool()` porque muta estado (envía un mensaje). Se resuelve inyectando el servicio como dependencia en vez de llamar por HTTP.

#### 1.3 Config inmutable per-request (fix race condition)

**¿Podría romper algo?** → **NO**, si se mantiene la misma interfaz de entrada/salida.

El problema actual:
```
T=0ms  Cuenta A: onConfigChange({ model: 'gpt-4o' })
T=1ms  Cuenta B: onConfigChange({ model: 'llama-3.1-8b' })  ← SOBREESCRIBE config de A
T=5ms  Cuenta A: generateSuggestion()  ← USA modelo de B (BUG)
```

La solución es pasar la config como parámetro, no mutarla en el singleton:

```typescript
// Cambio de firma:
// ANTES:
async generateSuggestion(event, context, recipientAccountId): Promise<AISuggestion | null>

// DESPUÉS:
async generateSuggestion(params: {
  event: MessageEvent;
  context: ContextData;
  accountId: string;
  config: FluxCoreConfig;        // inmutable, per-request
  composition: AssistantComposition;  // ya resuelto
}): Promise<AISuggestion | null>
```

Internamente, el método usa `params.config` en vez de `this.config`. El singleton sigue existiendo pero ya no muta estado entre requests.

#### 1.4 Descomponer `ai.service.ts`

**¿Cómo hacerlo sin degradación?**

Estrategia: **Extract & Delegate** — el singleton `AIService` sigue siendo el punto de entrada público, pero delega a servicios internos. Ningún import externo cambia.

```
PASO 1: Extraer ai-branding.service.ts
  → Mover: stripFluxCorePromoMarker(), appendFluxCoreBrandingFooter(),
    getSuggestionBrandingDecision(), stripFluxCoreBrandingFooterFromEnd()
  → AIService mantiene wrappers que delegan
  → RIESGO: Cero — son funciones puras sin side effects

PASO 2: Extraer ai-suggestion-store.ts
  → Mover: suggestions Map, getSuggestion(), approveSuggestion(),
    rejectSuggestion(), editSuggestion(), getPendingSuggestions()
  → RIESGO: Cero — CRUD en memoria, sin dependencias externas

PASO 3: Extraer ai-trace.service.ts
  → Mover: listTraces(), getTrace(), clearTraces(), exportTraces()
  → RIESGO: Cero — delegación pura a extension.listTraces/getTrace

PASO 4: Extraer ai-context.service.ts
  → Mover: buildContext()
  → RIESGO: Bajo — solo queries DB (accounts, conversations, relationships, messages)

PASO 5: Lo que queda en ai.service.ts (~300 líneas):
  → generateResponse(), executeOpenAIAssistantsPath(), loadFluxCoreModule(),
    getFluxCoreExtension(), emitSuggestion(), setWebSocketEmitter()
  → Este es el core real del servicio
```

**Regla de oro:** En cada paso, correr `bun run build` para verificar que compila. Si compila, no hay degradación.

#### 1.5 Structured logging

**¿Podría romper algo?** → **NO.** Es puramente aditivo.

```typescript
// Crear apps/api/src/utils/logger.ts
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const levels = { debug: 0, info: 1, warn: 2, error: 3 };

export const logger = {
  debug: (msg: string, data?: Record<string, any>) => {
    if (levels[LOG_LEVEL] <= 0) console.log(`[DEBUG] ${msg}`, data || '');
  },
  info: (msg: string, data?: Record<string, any>) => {
    if (levels[LOG_LEVEL] <= 1) console.log(`[INFO] ${msg}`, data || '');
  },
  warn: (msg: string, data?: Record<string, any>) => {
    if (levels[LOG_LEVEL] <= 2) console.warn(`[WARN] ${msg}`, data || '');
  },
  error: (msg: string, data?: Record<string, any>) => {
    if (levels[LOG_LEVEL] <= 3) console.error(`[ERROR] ${msg}`, data || '');
  },
};
```

En producción: `LOG_LEVEL=warn` elimina todo el ruido de debug/info. En desarrollo: `LOG_LEVEL=debug` muestra todo.

---

### Fase 2: Foundations (2-3 semanas) ✅ COMPLETADA 2026-02-09

#### 2.1 Persistir traces en DB + Sistema de Señales IA ✅

**Implementado:**
- Tabla `ai_traces` creada (migración `035_ai_persistence.sql`)
- Tabla `ai_signals` creada para señales internas del LLM
- `ai-trace.service.ts` reescrito: persiste a DB con fallback a extensión in-memory
- Métodos `persistTrace()` y `persistSignals()` disponibles
- `ai.service.ts` invoca `persistTrace()` fire-and-forget tras cada generación
- Parser de `|||SIGNALS|||` implementado en `ai.service.ts` (`parseSignals`/`stripSignalBlock`)

**Riesgos de migración:** Mínimos. Los traces estaban en un `Map<string, AITraceEntry>` en memoria. No había datos que migrar.

**Concepto de Señales IA (AI Signals):**

La idea de etiquetado interno por asistentes es excelente y crea una capa de **inteligencia acumulativa**. Propuesta de diseño:

##### Sintaxis recomendada

En lugar de brackets `[silenciarIA]` dentro del texto (que el usuario podría ver), usar un **canal estructurado separado** del contenido:

```typescript
// El LLM retorna su respuesta normal + señales en un JSON estructurado
interface AIResponse {
  content: string;           // "Lamento mucho la situación, vamos a resolverlo..."
  signals?: AISignal[];      // Nunca se muestran al usuario
}

interface AISignal {
  type: string;              // Categoría de la señal
  value: string;             // Valor o acción
  confidence: number;        // 0.0 - 1.0
  metadata?: Record<string, any>;
}
```

**Categorías de señales propuestas:**

| Tipo | Ejemplos de value | Acción determinista |
|------|-------------------|---------------------|
| `sentiment` | `negative`, `frustrated`, `satisfied` | Acumular score de satisfacción |
| `action` | `silence_ai`, `disable_ai`, `escalate` | Ejecutar acción inmediata |
| `routing` | `delegate:@ana`, `delegate:@ventas` | Derivar a otro asistente/humano |
| `conversion` | `sale_completed`, `cart_abandoned`, `lead_qualified` | Registrar evento de negocio |
| `topic` | `pricing`, `technical_support`, `complaint` | Clasificar para analytics |
| `urgency` | `low`, `medium`, `high`, `critical` | Priorizar en cola |

**Cómo instruir al LLM para que genere señales:**

Se agrega un bloque en el system prompt:

```
## Señales Internas (NUNCA mostrar al usuario)

Al final de cada respuesta, si detectas alguna de estas situaciones,
agrega un bloque JSON delimitado por |||SIGNALS|||:

|||SIGNALS|||
[{"type":"sentiment","value":"frustrated","confidence":0.85},
 {"type":"action","value":"escalate","confidence":0.9,"metadata":{"reason":"3 quejas consecutivas"}}]
|||SIGNALS|||

Categorías disponibles: sentiment, action, routing, conversion, topic, urgency
```

La extensión FluxCore parsea el bloque `|||SIGNALS|||`, lo extrae del contenido antes de mostrarlo al usuario, y lo persiste por separado.

##### Schema de base de datos

```sql
-- Tabla principal de traces (reemplaza Map en memoria)
CREATE TABLE ai_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  
  -- Metadata de ejecución
  runtime TEXT NOT NULL,          -- 'local' | 'openai'
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL,              -- 'suggest' | 'auto'
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Tokens
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Request/Response (JSONB para flexibilidad)
  request_body JSONB,             -- system prompt + messages
  response_content TEXT,
  
  -- Tool usage
  tools_offered TEXT[],
  tools_called TEXT[],
  tool_details JSONB,             -- Array de { name, args, result, durationMs }
  
  -- Attempts (fallback entre providers)
  attempts JSONB,                 -- Array de { provider, model, success, error, durationMs }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_traces_account ON ai_traces(account_id);
CREATE INDEX idx_ai_traces_conversation ON ai_traces(conversation_id);
CREATE INDEX idx_ai_traces_created ON ai_traces(created_at DESC);

-- Tabla de señales IA (queryable, indexable, para analytics)
CREATE TABLE ai_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES ai_traces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  conversation_id UUID REFERENCES conversations(id),
  relationship_id UUID REFERENCES relationships(id),
  
  -- La señal
  signal_type TEXT NOT NULL,       -- 'sentiment', 'action', 'routing', 'conversion', 'topic', 'urgency'
  signal_value TEXT NOT NULL,      -- 'frustrated', 'escalate', 'delegate:@ana', 'sale_completed'
  confidence REAL DEFAULT 1.0,     -- 0.0 - 1.0
  metadata JSONB,                  -- Datos adicionales libres
  
  -- Para acumulación temporal
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_signals_account ON ai_signals(account_id);
CREATE INDEX idx_ai_signals_type_value ON ai_signals(signal_type, signal_value);
CREATE INDEX idx_ai_signals_conversation ON ai_signals(conversation_id);
CREATE INDEX idx_ai_signals_created ON ai_signals(created_at DESC);

-- Vista materializada para scores acumulados por relación (opcional, para performance)
-- Ejemplo: "¿cuántas señales de frustración tiene este contacto en los últimos 7 días?"
CREATE VIEW ai_signal_scores AS
SELECT
  account_id,
  relationship_id,
  signal_type,
  signal_value,
  COUNT(*) as total_count,
  AVG(confidence) as avg_confidence,
  MAX(created_at) as last_seen
FROM ai_signals
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY account_id, relationship_id, signal_type, signal_value;
```

**¿Es bueno este enfoque?** → Sí, porque:
1. **Separa contenido de señales** — el usuario nunca ve las señales
2. **Las señales son queryables** — se pueden buscar por tipo, valor, confianza, fecha
3. **Permite acumulación** — "este contacto tiene 5 señales de frustración en 7 días → escalar"
4. **Alimenta determinismo** — las señales pueden disparar reglas deterministas del Agent Runtime
5. **Prepara bigdata/ML** — los datos están normalizados para exportación a pipelines de ML
6. **JSONB metadata** — flexibilidad total sin migraciones constantes

**Mejoras futuras:**
- Agregar `relationship_id` para acumular señales por contacto, no solo por conversación
- TimescaleDB para series temporales si el volumen crece
- Exportación periódica a data warehouse para ML

#### 2.2 Persistir suggestions en DB ✅

**Implementado:**
- Tabla `ai_suggestions` creada (migración `035_ai_persistence.sql`)
- `ai-suggestion-store.ts` reescrito: cache en memoria + write-through a DB
- `set()` persiste fire-and-forget, `approve()`/`reject()`/`edit()` actualizan DB
- Schema Drizzle en `packages/db/src/schema/ai-suggestions.ts`

#### 2.3 Rate limiting per-account ✅

**¿Cómo controlarlo desde tu cuenta de super admin?**

Ya existe infraestructura en `system-admin.service.ts` y `system-admin.routes.ts` (22 matches de isAdmin). La propuesta:

```sql
-- Nueva tabla (o columna en account_ai_entitlements)
ALTER TABLE account_ai_entitlements ADD COLUMN rate_limits JSONB DEFAULT '{
  "maxRequestsPerMinute": 10,
  "maxRequestsPerHour": 100,
  "maxTokensPerDay": 50000,
  "cooldownAfterBurstMs": 5000
}';
```

**UI en panel de Super Admin:**

```
System Admin → Cuentas → [Cuenta X] → Rate Limits
┌──────────────────────────────────────────┐
│ Rate Limits para @empresa-xyz            │
│                                          │
│ Requests/minuto:  [====10====]           │
│ Requests/hora:    [===100====]           │
│ Tokens/día:       [==50000===]           │
│ Cooldown burst:   [===5000ms=]           │
│                                          │
│ [Aplicar defaults]  [Guardar]            │
└──────────────────────────────────────────┘
```

Solo los usuarios con rol `system-admin` (tabla `system_admins`) pueden acceder. El middleware `isAdmin` que ya existe protege estas rutas.

#### 2.4 Circuit breaker para providers ✅

**Implementado:** `ai-circuit-breaker.service.ts` con estados closed/open/half-open. Si un provider falla 3 veces consecutivas, circuito abierto por 60s. Tras cooldown, permite 1 probe half-open. Success → cierra circuito. Admin puede resetear manualmente.

#### 2.5 Agent Flow schema + DB table

Ver Fase 3 para detalle.

---

### Fase 3: Agent Runtime Engine (3-4 semanas)

#### 3.1 Engine básico (sequential graph walker)

El motor que ejecuta un flujo paso a paso. Recorre el grafo de agentes en orden, pasando el contexto acumulado de un step al siguiente.

#### 3.2 Agent types: LLM, RAG, Deterministic, Tool

**¿RAG se considera una tool?**

**Ambas cosas.** Depende del contexto:

| Contexto | RAG es... | Porque... |
|----------|-----------|-----------|
| Dentro de un asistente single-agent | **Tool** (`search_knowledge`) | El LLM decide cuándo buscar, vía function calling |
| Dentro de un Agent Flow multi-agent | **Agent Type** propio | Tiene lógica autónoma: recibe query, busca en vector stores, rankea resultados, retorna contexto. No necesita un LLM para ejecutarse |
| Arquitectónicamente | **Capacidad** | Es una capacidad que puede manifestarse como tool o como agent según el diseño del flujo |

En el Agent Runtime Engine, RAG es un **agent type** porque:
- Puede ejecutarse independientemente (no requiere LLM para funcionar)
- Tiene configuración propia (topK, minScore, vectorStoreIds)
- Produce output estructurado que otros agents consumen
- En un flujo, un RAG agent puede correr **en paralelo** con otros agents

Pero **también sigue siendo tool** dentro de asistentes single-agent (como funciona hoy con `search_knowledge`). Ambos patrones coexisten.

#### 3.3 Context bus (shared state entre agents)

Mecanismo append-only e inmutable para que cada agent escriba sus outputs y el siguiente pueda leerlos.

#### 3.4 Condition evaluator

Evalúa expresiones como `{{ intent-classifier.intent == 'queja' }}` para decidir branches condicionales.

#### 3.5 Scope enforcer

Valida que cada agent no exceda sus límites (tokens, tiempo, tools permitidas).

---

### Fase 4: Multi-Agent Features (3-4 semanas)

**¿Se puede lograr usando las mismas interfaces que tenemos?**

**SÍ.** Tu modelo mental es correcto y es la mejor forma de pensarlo:

> "Un agente es una carpeta que contiene asistentes, herramientas, base de conocimiento, instrucciones. Lo que determina el comportamiento es el flujo."

Esto se mapea perfectamente a la arquitectura existente:

```
ENTIDADES EXISTENTES (ya en DB):
├── fluxcore_assistants     → Un asistente con modelConfig, timingConfig
├── fluxcore_instructions   → System prompts con versiones
├── fluxcore_vector_stores  → Bases de conocimiento
├── fluxcore_tools          → Tools registradas
└── fluxcore_tool_connections → Conexiones tool↔assistant

NUEVA ENTIDAD:
└── fluxcore_agents         → Un AGENTE es una composición de las entidades existentes
                              + un FLUJO que define cómo interactúan
```

**Modelo de datos del Agent:**

```sql
CREATE TABLE fluxcore_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'active' | 'archived'
  
  -- El flujo que define el comportamiento
  flow JSONB NOT NULL DEFAULT '{"steps":[]}',
  
  -- Scopes de seguridad
  scopes JSONB NOT NULL DEFAULT '{
    "allowedModels": [],
    "maxTotalTokens": 5000,
    "maxExecutionTimeMs": 30000,
    "allowedTools": [],
    "canCreateSubAgents": false
  }',
  
  -- Trigger: cuándo se activa este agente
  trigger_config JSONB DEFAULT '{"type":"message_received"}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relación N:M — Un agente "contiene" asistentes existentes
CREATE TABLE fluxcore_agent_assistants (
  agent_id UUID NOT NULL REFERENCES fluxcore_agents(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES fluxcore_assistants(id),
  role TEXT NOT NULL DEFAULT 'worker',  -- 'router', 'worker', 'reviewer'
  step_id TEXT,  -- ID del step en el flow JSON donde se usa este asistente
  PRIMARY KEY (agent_id, assistant_id)
);
```

**UI propuesta — Solapa "Agentes" en FluxCore Sidebar:**

```
FluxCore Sidebar (existente):
├── Uso
├── Asistentes         ← sigue existiendo, CRUD individual de asistentes
├── Instrucciones      ← sigue existiendo
├── Base de conocimiento ← sigue existiendo
├── Herramientas       ← sigue existiendo
├── 🆕 Agentes         ← NUEVA solapa
├── Debug
└── Facturación
```

**Vista de Agentes:**

```
┌──────────────────────────────────────────────────────┐
│ 🤖 Agentes                              [+ Crear]   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ 🟢 Soporte al Cliente                         │   │
│ │ 3 asistentes · 2 tools · 1 base de conocimiento│   │
│ │ Trigger: Mensaje recibido                      │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ ⚪ Calificador de Leads (draft)                │   │
│ │ 2 asistentes · 1 tool                          │   │
│ │ Trigger: Primer mensaje                        │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Editor de Agente (al hacer click):**

```
┌──────────────────────────────────────────────────────┐
│ ← Agentes / Soporte al Cliente                      │
│                                                      │
│ ┌─ Componentes ──────────────────────────────────┐   │
│ │                                                │   │
│ │ 🧩 Asistentes:                                 │   │
│ │   [Clasificador] [Responder Producto] [Quejas] │   │
│ │   + Agregar asistente existente                 │   │
│ │                                                │   │
│ │ 🔧 Herramientas: [search_knowledge] [templates]│   │
│ │ 📚 Conocimiento: [Catálogo Productos]          │   │
│ │ 📝 Instrucciones: [Política Soporte v2]        │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ Flujo ────────────────────────────────────────┐   │
│ │                                                │   │
│ │  [Mensaje] → [Clasificador] →┬→ [Producto]    │   │
│ │                               ├→ [Quejas]      │   │
│ │                               └→ [Responder]   │   │
│ │                                                │   │
│ │  [Editar flujo JSON]  [Editor visual]          │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ Scopes ───────────────────────────────────────┐   │
│ │ Tokens máx: [5000]  Tiempo máx: [30s]          │   │
│ │ Tools permitidas: [search_knowledge, templates] │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Lo que las fichas representan:**
- Cada asistente en la solapa "Asistentes" es una **ficha reutilizable**
- Un agente **compone** esas fichas en un flujo
- Si se modifica un asistente en "Asistentes", el cambio se refleja en todos los agentes que lo usan
- El agente NO duplica asistentes, los referencia

**Esto NO requiere reescribir nada existente.** Los asistentes, instrucciones, tools y vector stores siguen funcionando exactamente igual. El agente es una capa nueva que los orquesta.

#### 4.1 Router agent
El primer step de un flujo que clasifica la intención y decide qué branch seguir. Es un asistente con `temperature: 0.1` y un output schema JSON estricto.

#### 4.2 Parallel execution
Agents independientes que corren simultáneamente. Ejemplo: buscar en knowledge base Y clasificar sentimiento al mismo tiempo.

#### 4.3 Human-in-the-loop
Un step que pausa el flujo y envía una notificación al humano. El humano aprueba/rechaza/edita y el flujo continúa. Ya existe parcialmente con el modo `suggest` de los asistentes.

#### 4.4 Agent Flow editor (UI visual)
Un editor drag-and-drop para construir flujos visualmente. Puede empezar como editor JSON con preview del grafo, y evolucionar a visual.

#### 4.5 JSON-to-Flow API
Endpoint REST para crear/actualizar flujos desde JSON. Permite automatización y integración con herramientas externas.

---

### Fase 5: Enterprise (ongoing)
- [ ] OpenTelemetry integration
- [ ] Per-tenant API key management
- [ ] A/B testing de flujos
- [ ] Agent quality metrics (usando AI Signals para medir satisfacción, conversiones, etc.)
- [ ] Self-improvement loops (usar señales acumuladas para auto-ajustar prompts)

---

## 10. RESUMEN EJECUTIVO

| Pregunta | Respuesta |
|----------|-----------|
| ¿Funciona? | Sí, para single-agent simple |
| ¿Es enterprise? | En progreso. Race conditions resueltas. Observability básica (traces DB). Rate limiting y circuit breaker implementados. Falta scaling horizontal. |
| ¿Puede hacer los mejores agentes? | No. Es single-agent monolítico |
| ¿Se puede simplificar? | **Ya simplificado (Fase 1).** ~380 líneas eliminadas, 4 HTTP self-calls reemplazados, God Object descompuesto |
| ¿Se puede crear flujos desde JSON? | No hoy. Requiere Agent Runtime Engine (Fase 3) |
| ¿Qué falta más urgente? | Fase 3: Agent Runtime Engine (multi-agente, router, parallel execution) |
| ¿Rompe algo la Fase 1? | **Completada sin regresiones.** Build API verificado OK |
| ¿RAG es una tool? | Ambos: tool dentro de single-agent, agent type dentro de multi-agent |
| ¿Se reusan las interfaces existentes? | Sí. Un agente es una composición de asistentes/tools/KB existentes + un flujo |
| ¿Sistema de señales IA? | Excelente idea. Tabla `ai_signals` con tipo/valor/confianza, queryable para analytics y ML |

**El código actual tiene buenos cimientos** (EventBus, ExecutionPlan, ToolRegistry, RAG-as-Tool). **Fase 1 (Limpieza) y Fase 2 (Foundations) completadas.** Traces, signals y suggestions persistidos en DB. Rate limiting y circuit breaker activos. La base está lista para Fase 3 (Agent Runtime Engine).

**La visión de "agente como carpeta de fichas + flujo" es la correcta** — se mapea 1:1 con la arquitectura existente sin reescrituras, y las entidades actuales (asistentes, instrucciones, vector stores, tools) se convierten en piezas componibles de un sistema más poderoso.
