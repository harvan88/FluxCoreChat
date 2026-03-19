# Matriz de Responsabilidades - Runtime vs Sistema

**Fecha:** 2026-03-17  
**Propósito:** Clarificar qué pertenece al sistema FluxCore vs qué pertenece a cada runtime  
**Arquitectura:** Canon v4.0 - Separación de dominios  

---

## 🏗️ Matriz Comparativa de Responsabilidades

| Responsabilidad | Sistema FluxCore | AsistentesLocal | AsistentesOpenAI | Fluxy | Agentes (futuro) |
|---|---|---|---|---|---|---|
| **CONSTRUCCIÓN DE PROMPTS** | ❌ NO construye prompts | ✅ **SU PROPIO MÉTODO**<br/>- Usa `policyContext` + `instructions` + `tools`<br/>- Ensambla system prompt específico | ✅ **SU PROPIO MÉTODO**<br/>- Construye `instructionsOverride` desde `policyContext`<br/>- Formatea thread messages | ✅ **SU PROPIO MÉTODO**<br/>- Método completamente diferente<br/>- Probablemente sin instrucciones explícitas | ✅ **SU PROPIO MÉTODO**<br/>- Sistema de cognición interno<br/>- Construcción dinámica de prompts |
| **PROCESAMIENTO COGNITIVO** | ❌ NO procesa cognitivamente | ✅ **PROCESO COMPLETO**<br/>- Policy gate<br/>- Loop prevention<br/>- Tool selection<br/>- LLM completion<br/>- Tool calling loop | ✅ **PROCESO COMPLETO**<br/>- Policy gate<br/>- Loop prevention<br/>- Formateo a thread<br/>- LLM completion (OpenAI) | ✅ **PROCESO COMPLETO**<br/>- Policy gate<br/>- Loop prevention<br/>- Su propio método cognitivo | ✅ **PROCESO COMPLETO**<br/>- Policy gate<br/>- Loop prevention<br/>- Sistema de agencia interno |
| **EJECUCIÓN LLM** | ✅ **PROVEE SERVICIO**<br/>- `llmClient` compartido<br/>- Fallback entre providers | ✅ **USA SERVICIO**<br/>- Llama a `services.llmClient.complete()`<br/>- Maneja Groq/OpenAI | ✅ **USA API DIRECTA**<br/>- Llama a OpenAI Assistants API<br/>- No usa `llmClient` compartido | ✅ **USA SERVICIO**<br/>- Llama a `services.llmClient.complete()`<br/>- Su propia configuración | ✅ **USA SERVICIO**<br/>- Llama a `services.llmClient.complete()`<br/>- Posiblemente múltiples modelos |
| **TOOLS - DECLARACIÓN** | ❌ NO declara tools | ✅ **DECLARA CUÁLES OFRECER**<br/>- `search_knowledge` si tiene RAG<br/>- `send_template` si tiene plantillas | ✅ **RECIBE DECLARACIÓN DE FLUXCORE**<br/>- FluxCore declara functions a OpenAI<br/>- OpenAI procesa declaración | ✅ **DECLARA SUS PROPIAS**<br/>- Tools específicos de Fluxy<br/>- Probablemente sin RAG/templates | ✅ **DECLARA SUS PROPIAS**<br/>- Tools del agente<br/>- Capacidades específicas |
| **TOOLS - EJECUCIÓN** | ✅ **EJECUTA TODO**<br/>- RAG via `ragService`<br/>- Templates via `templateService`<br/>- **Ejecuta functions de OpenAI** cuando solicita<br/>- Certifica resultados | ❌ **NO EJECUTA**<br/>- Solo declara `search_knowledge`<br/>- Solo declara `send_template` | ❌ **NO EJECUTA**<br/>- Solo solicita a FluxCore<br/>- FluxCore ejecuta en su soberanía | ❌ **NO EJECUTA**<br/>- Solo declara sus tools | ❌ **NO EJECUTA**<br/>- Solo declara sus tools |
| **CERTIFICACIÓN KERNEL** | ✅ **ÚNICO PUNTO**<br/>- `CognitionGateway.certifyAiResponse()`<br/>- Todas las acciones pasan por aquí | ❌ **NO CERTIFICA**<br/>- Solo retorna `ExecutionAction[]` | ❌ **NO CERTIFICA**<br/>- Solo retorna `ExecutionAction[]` | ❌ **NO CERTIFICA**<br/>- Solo retorna `ExecutionAction[]` | ❌ **NO CERTIFICA**<br/>- Solo retorna `ExecutionAction[]` |
| **PROYECCIÓN A CHATCORE** | ✅ **PROYECTA RESULTADOS**<br/>- `ChatProjector` observa señales<br/>- `messageCore.receive()` ejecuta | ❌ **NO PROYECTA**<br/>- No conoce ChatCore | ❌ **NO PROYECTA**<br/>- No conoce ChatCore | ❌ **NO PROYECTA**<br/>- No conoce ChatCore | ❌ **NO PROYECTA**<br/>- No conoce ChatCore |
| **ACCESO A BASE DE DATOS** | ✅ **ACCESO COMPLETO**<br/>- Lee `policyContext`<br/>- Lee `runtimeConfig`<br/>- Ejecuta tools | ❌ **NO ACCESO**<br/>- Recibe todo en `RuntimeInput` | ❌ **NO ACCESO**<br/>- Recibe todo en `RuntimeInput` | ❌ **NO ACCESO**<br/>- Recibe todo en `RuntimeInput` | ❌ **NO ACCESO**<br/>- Recibe todo en `RuntimeInput` |
| **SERVICIOS COMPARTIDOS** | ✅ **PROVEE**<br/>- `llmClient`<br/>- `ragService`<br/>- `templateService`<br/>- `cognitionGateway` | ✅ **USA**<br/>- `services.llmClient`<br/>- (NO `promptBuilder`) | ❌ **NO USA SERVICIOS**<br/>- OpenAI API directa<br/>- FluxCore ejecuta functions | ✅ **USA**<br/>- `services.llmClient`<br/>- (NO `promptBuilder`) | ✅ **USA**<br/>- `services.llmClient`<br/>- (NO `promptBuilder`) |
| **CONFIGURACIÓN ESPECÍFICA** | ❌ **NO TIENE**<br/>- Solo configura sistema | ✅ **RECIBE**<br/>- `runtimeConfig.instructions`<br/>- `runtimeConfig.modelConfig`<br/>- `runtimeConfig.vectorStoreIds` | ✅ **RECIBE**<br/>- `runtimeConfig.externalAssistantId`<br/>- `runtimeConfig.modelConfig` | ✅ **RECIBE**<br/>- Su propia configuración<br/>- Probablemente mínima | ✅ **RECIBE**<br/>- Configuración del agente<br/>- Herramientas del agente |
| **TELEMETRÍA** | ✅ **CENTRALIZA**<br/>- `triggerSignalId` propagation<br/>- `ai_traces` unificadas<br/>- Sub-fases del runtime | ✅ **RECIBE ID**<br/>- `input.triggerSignalId`<br/>- Puede registrar sub-fases | ✅ **RECIBE ID**<br/>- `input.triggerSignalId`<br/>- Puede registrar sub-fases | ✅ **RECIBE ID**<br/>- `input.triggerSignalId`<br/>- Puede registrar sub-fases | ✅ **RECIBE ID**<br/>- `input.triggerSignalId`<br/>- Puede registrar sub-fases |

---

## 🔄 Flujo OpenAI Assistants API (Corregido)

### **Cómo Funciona Realmente:**

1. **FluxCore declara functions** a OpenAI Assistant
   ```typescript
   // FluxCore registra las functions disponibles
   const functions = [
     { name: 'search_knowledge', description: '...' },
     { name: 'send_template', description: '...' }
   ];
   ```

2. **OpenAI procesa y solicita ejecución**
   ```typescript
   // OpenAI retorna "requires_action" con tool_calls
   if (event.event === 'thread.run.requires_action') {
     // OpenAI está solicitando ejecutar functions
   }
   ```

3. **FluxCore ejecuta en su soberanía**
   ```typescript
   // FluxCore ejecuta las functions (RAG, Templates)
   const toolOutputs = data.required_action.submit_tool_outputs.tool_calls.map(tool => {
     if (tool.function.name === 'search_knowledge') {
       return { tool_call_id: tool.id, output: ragResult };
     }
   });
   ```

4. **FluxCore entrega resultados a OpenAI**
   ```typescript
   // FluxCore envía resultados a OpenAI para continuar
   await client.beta.threads.runs.submit_tool_outputs(toolOutputs);
   ```

5. **OpenAI genera respuesta final**
   ```typescript
   // OpenAI procesa resultados y genera respuesta
   // FluxCore certifica en Kernel
   ```

### **✅ Cumple con Canon v4.0:**

- **OpenAI solo procesa cognitivamente** - No ejecuta tools
- **FluxCore ejecuta todo** - RAG, Templates, functions
- **FluxCore certifica** - Único punto de certificación
- **Soberanía mantenida** - Todo en dominio de FluxCore

---

```
┌─────────────────────────────────────────────────────────────────┐
│                        SISTEMA FLUXCORE                         │
│  (Dominio Compartido - Sistema Nervioso)                         │
│                                                                 │
│  ✅ llmClient (servicio compartido)                               │
│  ✅ ragService (ejecuta RAG)                                     │
│  ✅ templateService (ejecuta plantillas)                         │
│  ✅ cognitionGateway (certifica Kernel)                          │
│  ✅ chatProjector (proyecta a ChatCore)                          │
│  ✅ telemetry (triggerSignalId)                                 │
│                                                                 │
│  ❌ NO construye prompts                                         │
│  ❌ NO procesa cognitivamente                                    │
│  ❌ NO toma decisiones                                           │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │                    │
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│AsistentesLocal│  │AsistentesOpenAI│  │    Fluxy    │  │   Agentes   │
│ (Runtime)    │  │   (Runtime)   │  │  (Runtime)  │  │  (Runtime)  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
         │                    │                    │                    │
         │ ✅ Construye     │                    │                    │
         │   prompts propios│                    │                    │
         │ ✅ Procesamiento  │                    │                    │
         │   cognitivo       │                    │                    │
         │ ✅ Declara tools  │                    │                    │
         │ ❌ NO ejecuta     │                    │                    │
         │ ❌ NO certifica   │                    │                    │
         │ ❌ NO proyecta    │                    │                    │
```

---

## 📋 Resumen por Dominio

### 🏛️ **Sistema FluxCore (Único responsable de):**
- **Ejecutar** todas las acciones declaradas
- **Certificar** vía Kernel (único punto)
- **Proveer** servicios compartidos (solo `llmClient`)
- **Proyectar** resultados a ChatCore
- **Centralizar** telemetría

### 🎯 **Cada Runtime (Responsable de):**
- **Construir** prompts con SU método específico
- **Procesar** cognitivamente el input
- **Decidir** qué tools necesita
- **Declarar** acciones (NUNCA ejecutar)
- **Usar** servicios compartidos

---

## 🔄 Flujo Unificado

```
1. Sistema FluxCore provee datos → Runtime
2. Runtime construye prompt (su método) → LLM
3. Runtime declara acciones → Sistema FluxCore
4. Sistema FluxCore ejecuta → ChatCore
5. Sistema FluxCore certifica → Kernel
```

**Cada runtime es un "cerebro diferente" que procesa la misma información de formas distintas, pero el "sistema nervioso" (FluxCore) es el mismo para todos.**

---

*Matriz actualizada para reflejar la separación arquitectónica correcta entre sistema y runtimes.*



# Arquitectura de Runtimes - Análisis Estructural

**Fecha:** 2026-03-17  
**Propósito:** Desestructurar la arquitectura de "room time" (runtimes) en FluxCoreChat  
**Foco:** Asistentes locales vs OpenAI vs otros runtimes  

---

## Visión General

Los **runtimes** son los "cerebros" que procesan los mensajes. Cada runtime es una implementación diferente de cómo generar respuestas IA, pero todos comparten el mismo contrato base.

## 1. Contrato Compartido (RuntimeAdapter)

**Todos los runtimes comparten:**

```typescript
interface RuntimeAdapter {
  readonly runtimeId: string;        // Identificador único
  readonly displayName: string;      // Nombre legible
  handleMessage(input: RuntimeInput): Promise<ExecutionAction[]>;
}
```

**Input universal (RuntimeInput):**
- `policyContext`: Gobernanza del negocio (tone, mode, windows, business profile)
- `runtimeConfig`: Configuración técnica (model, provider, instructions)
- `conversationHistory`: Historial semántico de mensajes

**Output universal (ExecutionAction[]):**
- `send_message`: Respuesta de texto
- `send_template`: Plantilla predefinida
- `start_typing`: Indicador de escritura
- `no_action`: Sin acción (con razón)

**⚠️ CRÍTICO: Violación del Canon v4.0**
Los runtimes NUNCA deben ejecutar acciones directamente. Por Canon v4.0:
1. Runtime retorna `ExecutionAction[]` (declaración de intención)
2. FluxCore certifica señal en Kernel (`AI_RESPONSE_GENERATED`)
3. ChatCore recibe señal y ejecuta la acción real
4. **FluxCore NO envía mensajes directamente**

## 2. Runtimes Actuales

### A. AsistentesLocalRuntime (`asistentes-local`)

**Archivo:** `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`

**Características específicas:**
- **Ejecución local** via Chat Completions API (OpenAI/Groq)
- **Instrucciones en BD local** (fluxcore_instructions)
- **Tools integrados:** `search_knowledge`, `send_template`
- **Multi-round tool calling** (máx 2 rondas)
- **RAG via HTTP call** a `/fluxcore/runtime/rag-context`

**⚠️ VIOLACIÓN ACTUAL:** Runtime Local ejecuta tools directamente via HTTP calls, violando el Canon v4.0.

**Flujo CANÓNICO (debería ser):**
1. Verifica `policyContext.mode !== 'off'`
2. Build prompt con `promptBuilder`
3. Ofrece tools si tiene RAG/templates
4. Loop de tool calls (máx 2 rondas)
5. **Retorna ExecutionAction[]** (NO ejecuta directamente)
6. FluxCore certifica `AI_RESPONSE_GENERATED` en Kernel
7. ChatCore ejecuta la acción real (mensaje/plantilla)

**Invariants del Canon:**
- NO DB access durante handleMessage
- NO direct effect execution — retorna actions solo
- NO calls a otros runtimes
- Todo config llega en RuntimeInput.runtimeConfig

### B. AsistentesOpenAIRuntime (`asistentes-openai`)

**Archivo:** `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`

**Características específicas:**
- **Ejecución remota** via OpenAI Assistants API
- **Instrucciones en OpenAI** (256K chars)
- **Requiere `runtimeConfig.externalAssistantId`**
- **Sin tools locales** (delega a OpenAI)

**Flujo:**
1. Verifica `externalAssistantId` existe
2. Formatea `conversationHistory` como thread messages
3. Construye `instructionsOverride` desde PolicyContext
4. Llama `runAssistantWithMessages()`
5. Retorna `send_message`

**Invariants del Canon:**
- Paralelo e independiente de AsistentesLocalRuntime
- Nunca es fallback del runtime local
- PolicyContext tiene prioridad sobre instrucciones de OpenAI

## 3. Configuración Compartida

### Database Schema

**`fluxcore_assistants`:**
```typescript
{
  runtime: 'local' | 'openai',     // ← Qué runtime usar
  externalId: string,              // OpenAI ID si runtime='openai'
  modelConfig: { provider, model, temperature },
  timingConfig: { responseDelaySeconds, smartDelay }
}
```

**`account_runtime_config`:**
```typescript
{
  activeRuntimeId: '@fluxcore/fluxcore',  // ← Runtime global por cuenta
  config: { preferredAssistantId: 'uuid' } // ← Asistente activo
}
```

### Runtime Resolution

**Archivo:** `apps/api/src/services/fluxcore/runtime.service.ts`

```typescript
// Flujo de resolución
1. accountRuntimeConfig.activeRuntimeId → Runtime global
2. config.preferredAssistantId → Asistente específico
3. Fallback: assistantsService.ensureActiveAssistant()
```

## 4. Puntos en Común

**Comparten todos:**
- ✅ **PolicyContext governance** (mode, tone, windows)
- ✅ **RuntimeInput contract** (misma estructura)
- ✅ **ExecutionAction output** (mismas acciones)
- ✅ **Mode gating** (`mode === 'off'` → no_action)
- ✅ **Loop prevention** (último mensaje debe ser de user)
- ✅ **CognitiveDispatcher mediation** (no ejecución directa)

**Comparten Local + OpenAI:**
- ✅ **Assistant composition** (instructions, vectorStores, tools)
- ✅ **Database persistence** (misma tabla `fluxcore_assistants`)
- ✅ **Runtime resolution** vía `resolveActiveAssistant()`

## 5. Diferencias Clave

| Aspecto | Local | OpenAI |
|---|---|---|
| **Ejecución** | Chat Completions API | Assistants API |
| **Instrucciones** | BD local (fluxcore_instructions) | OpenAI (256K) |
| **Tools** | Integrados (RAG, templates) | Delegados a OpenAI |
| **State management** | Stateless | Thread-based |
| **External dependency** | Solo API key | Assistant ID requerido |
| **Tool calling** | Manual loop (2 rondas) | Automático en OpenAI |

## 6. Runtime Local - Análisis Profundo

### Arquitectura Interna

```typescript
AsistentesLocalRuntime.handleMessage()
├── Policy validation (mode gate)
├── Loop prevention
├── Prompt building (promptBuilder)
├── Tool selection (RAG + templates)
├── LLM completion (llmClient)
├── ⚠️ Tool execution loop (VIOLACIÓN DEL CANON)
│   ├── search_knowledge → HTTP /rag-context (DIRECTO)
│   └── send_template → TemplateAction (DIRECTO)
└── Action return
```

**❌ PROBLEMA CRÍTICO:** El runtime está ejecutando tools directamente, violando la separación FluxCore ↔ ChatCore del Canon v4.0.

### Dependencies del Runtime Local

- **`promptBuilder`**: Construye system prompt + messages
- **`llmClient`**: Abstrae OpenAI/Groq con fallback
- **`/fluxcore/runtime/rag-context`**: Endpoint HTTP para RAG
- **Template Registry**: Inyección dinámica de plantillas

### Capacidades Específicas

1. **RAG-as-Tool**: El LLM decide cuándo buscar
2. **Template sending**: Respuestas predefinidas
3. **Provider fallback**: OpenAI → Groq automático
4. **Tool rounds control**: Máx 2 rondas para evitar loops

### Tools del Runtime Local

```typescript
const SEARCH_KNOWLEDGE_TOOL: LLMTool = {
  name: 'search_knowledge',
  description: 'Search the knowledge base for relevant information',
  parameters: { query: 'string' }
};

const SEND_TEMPLATE_TOOL: LLMTool = {
  name: 'send_template',
  description: 'Send a predefined message template',
  parameters: { 
    templateId: 'string',
    variables: 'object'
  }
};
```

## 7. Flujo de Selección y Ejecución

### CognitiveDispatcher

**❌ FLUJO ACTUAL (INCORRECTO):**
```typescript
// 4. Ejecutar
const actions = await runtime.handleMessage(input);

// 5. Mediar acciones
await actionExecutor.execute(actions);
```

**✅ FLUJO CANÓNICO v4.0 (CORRECTO):**
```typescript
// 4. Ejecutar runtime
const actions = await runtime.handleMessage(input);

// 5. Certificar decisión en Kernel
await cognitionGateway.certifyAiResponse({
  actions,
  conversationId: input.policyContext.conversationId,
  accountId: input.policyContext.accountId
});

// 6. ChatCore recibe señal AI_RESPONSE_GENERATED
// 7. ChatCore ejecuta acciones reales (messageCore.receive)
```

**⚠️ VIOLACIÓN:** ActionExecutor está ejecutando directamente en FluxCore, cuando debería ser ChatCore vía Kernel.

### Runtime Registry

```typescript
// Registro de runtimes (implícito en el código)
const runtimes = new Map([
  ['local', asistentesLocalRuntime],
  ['openai', asistentesOpenAIRuntime],
  // Futuros: ['anthropic', asistentesAnthropicRuntime]
]);
```

## 8. Tipos Definidos

**Archivo:** `apps/api/src/core/fluxcore-types.ts`

```typescript
export type ExecutionAction =
  | SendMessageAction
  | SendTemplateAction
  | StartTypingAction
  | NoAction
  // Fluxi/WES actions (H4)
  | ProposeWorkAction
  | OpenWorkAction
  | AdvanceWorkStateAction
  | RequestSlotAction
  | CloseWorkAction;

export interface RuntimeInput {
  policyContext: FluxPolicyContext;
  runtimeConfig: RuntimeConfig;
  conversationHistory: ConversationMessage[];
}
```

## 9. Extensibilidad

Para agregar un nuevo runtime:

1. **Implementar RuntimeAdapter:**
```typescript
export class AsistentesAnthropicRuntime implements RuntimeAdapter {
  readonly runtimeId = 'asistentes-anthropic';
  readonly displayName = 'Asistentes Anthropic (v8.3)';
  
  async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
    // Implementación específica
  }
}
```

2. **Registrar en el dispatcher:**
```typescript
// En cognitive-dispatcher.service.ts
const runtime = getRuntime(composition.assistant.runtime);
```

3. **Agregar al schema:**
```typescript
// En fluxcore-assistants.ts
runtime: varchar('runtime', { length: 20 }).notNull()
  .default('local'), // 'local', 'openai', 'anthropic'
```

**Ejemplos de runtimes futuros:**
- **Anthropic Runtime**: Claude con tool calling
- **Ollama Runtime**: Modelos locales
- **Custom Runtime**: Lógica de negocio específica
- **WES Runtime**: Work Execution System

## 10. Consideraciones de Diseño

### Single Source of Truth

- **PolicyContext**: Gobernanza del negocio (única fuente)
- **RuntimeConfig**: Configuración técnica (única fuente)
- **ExecutionAction**: Salida estandarizada (única fuente)

### Sovereignty (Canon v8.3)

- **Runtimes son soberanos**: No acceden a BD directamente
- **Todo llega resuelto**: Input contiene todo lo necesario
- **Retornan acciones**: No ejecutan efectos directamente
- **⚠️ VIOLACIÓN ACTUAL**: Runtime Local ejecuta tools vía HTTP calls

### Separación FluxCore ↔ ChatCore (Canon v4.0)

**✅ Flujo Canónico:**
```
Runtime (decisión) → Kernel (certificación) → ChatCore (ejecución)
```

**❌ Flujo Actual (violación):**
```
Runtime (decisión + ejecución directa) → ActionExecutor
```

**Impacto:**
- FluxCore está escribiendo directamente en ChatCore
- Sin certificación de decisiones en Kernel
- Sin trazabilidad canónica
- Violación de soberanía de dominios

### Parallel Execution

- **Runtimes son independientes**: No se llaman entre sí
- **No hay fallbacks**: Cada runtime es responsable de su implementación
- **Dispatcher elige**: Basado en configuración del asistente

## 11. Debugging y Tracing

### Logging por Runtime

```typescript
// Runtime Local
console.log(`[AsistentesLocal] → ${provider}/${model} | RAG:${hasRAG} Templates:${hasTemplates}`);

// Runtime OpenAI
console.log(`[AsistentesOpenAI] Running assistant ${assistantExternalId}`);
```

### AI Traces

Los traces incluyen:
- `runtimeId`: Qué runtime se usó
- `assistantId`: Qué asistente procesó
- `toolUse`: Si se usaron tools (runtime local)
- `duration`: Tiempo de ejecución
- `tokens`: Tokens consumidos

## 12. Performance Considerations

### Runtime Local

- **Latency**: Directa a API provider
- **Statelessness**: Sin mantenimiento de threads
- **Tool overhead**: HTTP calls para RAG
- **Memory**: Baja (solo prompt actual)

### Runtime OpenAI

- **Latency**: Mayor (thread creation + run)
- **Statefulness**: Threads persistentes
- **Tool overhead**: Incluido en OpenAI
- **Memory**: Mayor (contexto del thread)

## 13. Security Considerations

### Runtime Local

- **API Keys**: Protección de secrets
- **RAG Access**: Scope por vector store
- **Template Authorization**: Verificación de permisos

### Runtime OpenAI

- **Assistant ID**: Validación de propiedad
- **Thread Isolation**: Por conversación
- **Instruction Override**: PolicyContext tiene prioridad

---

## Conclusión

La arquitectura de runtimes en FluxCoreChat está diseñada para ser:

1. **Modular**: Cada runtime es una implementación independiente
2. **Extensible**: Fácil agregar nuevos runtimes
3. **Consistente**: Contrato universal compartido
4. **Sovereign**: Cada runtime maneja su propia lógica
5. **❌ VIOLACIÓN CRÍTICA**: No está respetando la separación FluxCore ↔ ChatCore

## 🚨 Problemas Críticos Identificados

### 1. Violación del Canon v4.0
- **Runtime Local ejecuta tools directamente** via HTTP calls (líneas 232-236)
- **ActionExecutor ejecuta acciones** en lugar de ChatCore
- **FluxCore escribe directamente** en ChatCore sin certificación

### 2. Arquitectura Incorrecta Actual
```
❌ Runtime → HTTP calls → Direct execution
✅ Runtime → Actions → Kernel → ChatCore
```

### 3. Herramientas Duplicadas
- **Capabilities del sistema**: `SYSTEM_SEARCH_KNOWLEDGE`, `SYSTEM_SEND_TEMPLATE`
- **Tools del runtime**: Declaraciones duplicadas
- **Ejecución mixta**: Runtime local vs AIToolService

### 4. 🆕 PROBLEMAS DETECTADOS EN ANÁLISIS DE CÓDIGO

#### 4.1 RuntimeInput NO incluye triggerSignalId
**Problema:** El `RuntimeInput` actual (líneas 137-150 en fluxcore-types.ts) no incluye `triggerSignalId`:

```typescript
export interface RuntimeInput {
    policyContext: FluxPolicyContext;
    runtimeConfig: RuntimeConfig;
    conversationHistory: ConversationMessage[];
    // ❌ FALTA: triggerSignalId: string;
}
```

**Impacto:** El runtime no puede propagar el ID al Live Cognitive Pipeline.

#### 4.2 El runtime no recibe triggerSignalId
**Problema:** En `cognitive-dispatcher.service.ts` (líneas 209-215), el `RuntimeInput` se construye sin `triggerSignalId`:

```typescript
const input: RuntimeInput = {
    policyContext,
    runtimeConfig: enrichedRuntimeConfig,
    conversationHistory,
    // ❌ FALTA: triggerSignalId: params.triggerSignalId
};
```

#### 4.3 Violación concreta en executeSearchKnowledge
**Problema:** Líneas 232-236 en `asistentes-local.runtime.ts`:

```typescript
const response = await fetch(`http://localhost:${API_PORT}/fluxcore/runtime/rag-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId, query, vectorStoreIds, options: { topK: 5, maxTokens: 2000 } }),
});
```

**Esto es una violación directa del Canon v4.0** - el runtime está haciendo HTTP calls.

#### 4.4 Template Action retorna directamente
**Problema:** Líneas 175-178, el runtime retorna directamente una acción sin pasar por Kernel:

```typescript
if (toolCall.function.name === 'send_template' && toolResult.templateAction) {
    console.log(`[AsistentesLocal] ✅ Template sent: ${toolResult.templateAction.templateId}`);
    return [toolResult.templateAction as ExecutionAction]; // ❌ VIOLACIÓN
}
```

#### 4.5 Dependencies internas del runtime
**Problema:** El runtime depende de servicios que no debería conocer:

```typescript
import { promptBuilder } from '../prompt-builder.service';    // Línea 21
import { llmClient } from '../llm-client.service';            // Línea 22
```

**Canon Violation:** El runtime debería recibir todo en `RuntimeInput`.

## 🏗️ Separación de Responsabilidades (Arquitectura Canónica)

### 🎯 Responsabilidades del Runtime (Dominio Específico)
El runtime **SOLO** es responsable de:

1. **Procesamiento cognitivo** - Analizar el contexto y decidir qué hacer
2. **Construcción de prompts** - ✅ **SU PROPIO MÉTODO** para armar prompts
3. **Selección de tools** - Decidir qué herramientas ofrecer al LLM
4. **Ejecución LLM** - Llamar al modelo (OpenAI/Groq/Anthropic)
5. **Declaración de acciones** - Retornar `ExecutionAction[]` (NO ejecutar)
6. **Tool calling loop** - Manejar rondas de tools del LLM

**Ejemplos por runtime:**
- **AsistentesLocal**: Construye prompt con `policyContext` + `instructions` + `tools`
- **Fluxi**: Tiene su propio método de construcción cognitiva
- **Agentes**: Armarian su sistema de cognición internamente

### 🏛️ Responsabilidades del Sistema FluxCore (Dominio Compartido)
FluxCore es responsable de:

1. **Certificación Kernel** - `CognitionGateway.certifyAiResponse()`
2. **Proyección de Contexto** - `ChatProjector` observa señales
3. **Ejecución de Acciones** - `ActionExecutor` media con ChatCore
4. **Servicios Compartidos** - ❌ **NO promptBuilder** (es responsabilidad del runtime)
5. **Telemetría Unificada** - `triggerSignalId` propagation
6. **Gestión de Tools** - Capabilities del sistema (`SYSTEM_SEARCH_KNOWLEDGE`)

---

## 🔄 Arquitectura Correcta: Separación Clara

### Runtime (Dominio Aislado)
```typescript
export class AsistentesLocalRuntime implements RuntimeAdapter {
  async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
    // ✅ RESPONSABILIDAD DEL RUNTIME: Procesamiento cognitivo completo
    
    // 1. Validar input (sin acceso a BD)
    // 2. ✅ CONSTRUIR PROMPT (su propio método)
    //    - Usa policyContext + runtimeConfig + conversationHistory
    //    - Cada runtime tiene su forma de hacerlo
    // 3. Decidir si usar tools
    // 4. Llamar al LLM (via servicio compartido)
    // 5. Manejar tool calling loop
    // 6. RETORNAR ACCIONES (NUNCA ejecutar)
    
    return [{
      type: 'send_message',
      content: result.content
    }];
  }
}
```

### Sistema FluxCore (Dominio Compartido)
```typescript
// En cognitive-dispatcher.service.ts
const actions = await runtime.handleMessage(input);

// ✅ RESPONSABILIDAD DEL SISTEMA: Certificación y ejecución
await cognitionGateway.certifyAiResponse({
  actions,
  triggerSignalId: input.triggerSignalId
});

// ChatProjector observa y ejecuta via ChatCore
```

---

## 🚨 Problema Actual: Inversión de Responsabilidades

### ❌ Lo que el runtime está haciendo INCORRECTAMENTE:
1. **HTTP calls directos** - `executeSearchKnowledge` (línea 232)
2. **Acceso a servicios específicos** - `promptBuilder`, `llmClient`
3. **Ejecución de tools** - Debería declarar necesidad, no ejecutar

### ❌ Lo que el sistema NO está haciendo:
1. **Proveer servicios compartidos** al runtime
2. **Certificar acciones** del runtime
3. **Ejecutar tools** en nombre del runtime

---

## 🎨 Arquitectura Canónica Propuesta

### 1. Runtime Recibe Solo lo Necesario
```typescript
export interface RuntimeServices {
  llmClient: LLMClient;  // ✅ Solo LLM client (compartido)
  // ❌ NO promptBuilder (es responsabilidad del runtime)
}

export interface RuntimeInput {
  policyContext: FluxPolicyContext;      // ✅ Contexto autorizado por usuario
  runtimeConfig: RuntimeConfig;          // ✅ Config específica del runtime
  conversationHistory: ConversationMessage[]; // ✅ Historial
  triggerSignalId: string;               // ✅ Para telemetría
  services: RuntimeServices;             // ✅ Solo servicios compartidos
}
```

### 2. Runtime Construye su Propio Prompt
```typescript
// ✅ CORRECTO - Cada runtime construye su prompt
class AsistentesLocalRuntime {
  private buildPrompt(input: RuntimeInput) {
    // Método específico de AsistentesLocal
    const systemPrompt = this.assembleSystemPrompt(
      input.policyContext,      // Contexto autorizado
      input.runtimeConfig,      // Instrucciones del usuario
      input.conversationHistory // Herramientas configuradas
    );
    
    return { systemPrompt, messages: this.formatMessages(input.conversationHistory) };
  }
}

// ✅ CORRECTO - Fluxi tiene su propio método
class FluxiRuntime {
  private buildPrompt(input: RuntimeInput) {
    // Método completamente diferente de Fluxi
    return this.fluxiPromptBuilder(input);
  }
}

// ✅ CORRECTO - Agentes tendrían su método
class AgentRuntime {
  private buildPrompt(input: RuntimeInput) {
    // Método específico del agente
    return this.agentCognitiveBuilder(input);
  }
}
```

### 3. Sistema FluxCore Solo Ejecuta
```typescript
// En ActionExecutor
if (action.type === 'search_knowledge') {
  // ✅ RESPONSABILIDAD DEL SISTEMA: Ejecutar RAG
  const ragContext = await ragService.buildContext(action.query, action.vectorStoreIds);
  
  // Certificar y continuar el tool calling loop
  return await runtime.continueWithToolResult(toolCallId, ragContext);
}
```

---

## 🔄 Flujo Canónico Correcto

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Runtime       │    │  FluxCore System │    │    Kernel       │
│ (Dominio        │    │  (Dominio         │    │ (Certificación) │
│  Específico)     │    │   Compartido)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. handleMessage()   │                       │
         │─────────────────────→│                       │
         │                       │                       │
         │                       │ 2. certifyAiResponse│
         │                       │─────────────────────→│
         │                       │                       │
         │                       │ 3. AI_RESPONSE_GENERATED
         │                       │←─────────────────────│
         │                       │                       │
         │                       │ 4. Ejecutar acciones │
         │                       │─────────────────────→│ ChatCore
```

---

## 🎯 Responsabilidades Clarificadas

### Runtime (SOLO esto):
- ✅ **Lógica cognitiva completa** - Incluye construcción de prompts
- ✅ **Construcción de prompts** - Su propio método específico
- ✅ **Decisión de tools** - Qué tools necesita
- ✅ **LLM interaction** - Cómo hablar con el modelo
- ✅ **Declaración de acciones** - Qué quiere hacer

### FluxCore System (TODO esto):
- ✅ **Inyección de servicios** - Solo `llmClient` (NO promptBuilder)
- ✅ **Ejecución de tools** - RAG, Templates, etc.
- ✅ **Certificación Kernel** - `CognitionGateway`
- ✅ **Telemetría** - `triggerSignalId` propagation
- ✅ **Proyección** - `ChatProjector`
- ❌ **NO construir prompts** - Es responsabilidad del runtime

---

## 📋 Correcciones Arquitectónicas Necesarias

### 1. **Separar Dependencies del Runtime**
```typescript
// ❌ REMOVER del runtime
import { promptBuilder } from '../prompt-builder.service';
import { llmClient } from '../llm-client.service';

// ✅ RECIBIR por inyección
constructor(private services: RuntimeServices) {}
```

### 2. **Convertir Ejecución a Declaración**
```typescript
// ❌ HTTP directo en runtime
fetch(`/rag-context`, {...})

// ✅ Declaración en runtime
return [{ type: 'search_knowledge', query, vectorStoreIds }]

// ✅ Ejecución en sistema FluxCore
if (action.type === 'search_knowledge') {
  await ragService.buildContext(action.query, action.vectorStoreIds)
}
```

### 3. **Unificar Certificación**
```typescript
// ❌ Cada runtime certifica individualmente
// ❌ Runtime ejecuta acciones directamente

// ✅ Sistema FluxCore certifica TODAS las acciones
await cognitionGateway.certifyAiResponse(actions, triggerSignalId);
```

---

## 📊 Matriz de Responsabilidades Completa

### 🏗️ Separación por Dominio

| Responsabilidad | Sistema FluxCore | AsistentesLocal | AsistentesOpenAI | Fluxy | Agentes (futuro) |
|---|---|---|---|---|---|---|
| **CONSTRUCCIÓN DE PROMPTS** | ❌ NO construye prompts | ✅ **SU PROPIO MÉTODO**<br/>- Usa `policyContext` + `instructions` + `tools`<br/>- Ensambla system prompt específico | ✅ **SU PROPIO MÉTODO**<br/>- Construye `instructionsOverride` desde `policyContext`<br/>- Formatea thread messages | ✅ **SU PROPIO MÉTODO**<br/>- Método completamente diferente<br/>- Probablemente sin instrucciones explícitas | ✅ **SU PROPIO MÉTODO**<br/>- Sistema de cognición interno<br/>- Construcción dinámica de prompts |
| **PROCESAMIENTO COGNITIVO** | ❌ NO procesa cognitivamente | ✅ **PROCESO COMPLETO**<br/>- Policy gate<br/>- Loop prevention<br/>- Tool selection<br/>- LLM completion<br/>- Tool calling loop | ✅ **PROCESO COMPLETO**<br/>- Policy gate<br/>- Loop prevention<br/>- Formateo a thread<br/>- LLM completion (OpenAI) | ✅ **PROCESO COMPLETO**<br/>- Policy gate<br/>- Loop prevention<br/>- Su propio método cognitivo | ✅ **PROCESO COMPLETO**<br/>- Policy gate<br/>- Loop prevention<br/>- Sistema de agencia interno |
| **EJECUCIÓN LLM** | ✅ **PROVEE SERVICIO**<br/>- `llmClient` compartido<br/>- Fallback entre providers | ✅ **USA SERVICIO**<br/>- Llama a `services.llmClient.complete()`<br/>- Maneja Groq/OpenAI | ✅ **USA API DIRECTA**<br/>- Llama a OpenAI Assistants API<br/>- No usa `llmClient` compartido | ✅ **USA SERVICIO**<br/>- Llama a `services.llmClient.complete()`<br/>- Su propia configuración | ✅ **USA SERVICIO**<br/>- Llama a `services.llmClient.complete()`<br/>- Posiblemente múltiples modelos |
| **TOOLS - DECLARACIÓN** | ❌ NO declara tools | ✅ **DECLARA CUÁLES OFRECER**<br/>- `search_knowledge` si tiene RAG<br/>- `send_template` si tiene plantillas | ❌ **NO DECLARA**<br/>- Delega a OpenAI | ✅ **DECLARA SUS PROPIAS**<br/>- Tools específicos de Fluxy<br/>- Probablemente sin RAG/templates | ✅ **DECLARA SUS PROPIAS**<br/>- Tools del agente<br/>- Capacidades específicas |
| **TOOLS - EJECUCIÓN** | ✅ **EJECUTA TODO**<br/>- RAG via `ragService`<br/>- Templates via `templateService`<br/>- Certifica resultados | ❌ **NO EJECUTA**<br/>- Solo declara `search_knowledge`<br/>- Solo declara `send_template` | ❌ **NO EJECUTA**<br/>- Delega a OpenAI | ❌ **NO EJECUTA**<br/>- Solo declara sus tools | ❌ **NO EJECUTA**<br/>- Solo declara sus tools |
| **CERTIFICACIÓN KERNEL** | ✅ **ÚNICO PUNTO**<br/>- `CognitionGateway.certifyAiResponse()`<br/>- Todas las acciones pasan por aquí | ❌ **NO CERTIFICA**<br/>- Solo retorna `ExecutionAction[]` | ❌ **NO CERTIFICA**<br/>- Solo retorna `ExecutionAction[]` | ❌ **NO CERTIFICA**<br/>- Solo retorna `ExecutionAction[]` | ❌ **NO CERTIFICA**<br/>- Solo retorna `ExecutionAction[]` |
| **SERVICIOS COMPARTIDOS** | ✅ **PROVEE**<br/>- `llmClient`<br/>- `ragService`<br/>- `templateService`<br/>- `cognitionGateway` | ✅ **USA**<br/>- `services.llmClient`<br/>- (NO `promptBuilder`) | ✅ **USA**<br/>- OpenAI API directa<br/>- (NO `llmClient`) | ✅ **USA**<br/>- `services.llmClient`<br/>- (NO `promptBuilder`) | ✅ **USA**<br/>- `services.llmClient`<br/>- (NO `promptBuilder`) |

### 🎨 Flujo Arquitectónico Unificado

```
┌─────────────────────────────────────────────────────────────────┐
│                        SISTEMA FLUXCORE                         │
│  (Dominio Compartido - Sistema Nervioso)                         │
│                                                                 │
│  ✅ llmClient (servicio compartido)                               │
│  ✅ ragService (ejecuta RAG)                                     │
│  ✅ templateService (ejecuta plantillas)                         │
│  ✅ cognitionGateway (certifica Kernel)                          │
│  ✅ chatProjector (proyecta a ChatCore)                          │
│  ✅ telemetry (triggerSignalId)                                 │
│                                                                 │
│  ❌ NO construye prompts                                         │
│  ❌ NO procesa cognitivamente                                    │
│  ❌ NO toma decisiones                                           │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│AsistentesLocal│  │AsistentesOpenAI│  │    Fluxy    │  │   Agentes   │
│ (Runtime)    │  │   (Runtime)   │  │  (Runtime)  │  │  (Runtime)  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### 📋 Reglas de Oro

1. **Cada runtime construye sus propios prompts** - Su método específico
2. **Solo FluxCore ejecuta acciones** - RAG, Templates, etc.
3. **Solo FluxCore certifica** - Via Kernel, único punto
4. **Cada runtime declara tools** - Pero no las ejecuta
5. **FluxCore solo provee `llmClient`** - NO `promptBuilder`

## 📋 Próximos Pasos (Actualizados con Separación de Responsabilidades)

### 1. Definir Contrato de Servicios (CRÍTICO)
- ✅ **Crear `RuntimeServices` interface** - Solo `llmClient` (NO promptBuilder)
- ✅ **Modificar `RuntimeInput`** - Incluir `services` y `triggerSignalId`
- ✅ **Actualizar `CognitiveDispatcher`** - Inyectar servicios al runtime

### 2. Refactorizar Runtime Local (CRÍTICO)
- ❌ **Remover dependency directa** - `promptBuilder` (mantener construcción propia)
- ❌ **Remover dependency directa** - `llmClient` (recibir por inyección)
- ❌ **Convertir HTTP calls a declaraciones** - `search_knowledge` action
- ❌ **Remover ejecución de tools** - Solo declarar intenciones
- ✅ **Mantener construcción de prompts** - Es responsabilidad del runtime
- ✅ **Usar servicios inyectados** - Solo `llmClient` via `RuntimeServices`

### 3. Implementar ActionExecutor Extendido
- ✅ **Ejecutar actions de tools** - RAG, Templates
- ✅ **Manejar tool calling loop** - Continuar conversación con LLM
- ✅ **Certificar vía CognitionGateway** - Único punto de certificación

### 4. Validar Separación de Dominios
- ✅ **Runtime solo procesa cognitivamente** - Sin efectos secundarios
- ✅ **FluxCore ejecuta todo** - Certificación y efectos
- ✅ **Kernel como único mediador** - Single source of truth

---

## 🔍 Código Legacy Identificado (Actualizado)

### Dependencies que deben inyectarse (no eliminarse):
```typescript
// ❌ REMOVER del runtime (violación de dominio)
import { promptBuilder } from '../prompt-builder.service'; // ❌ Runtime construye sus propios prompts
import { llmClient } from '../llm-client.service';

// ✅ RECIBIR por inyección (separación de dominios)
export interface RuntimeServices {
  llmClient: LLMClient;  // ✅ Solo LLM client es compartido
}

constructor(private services: RuntimeServices) {}
```

### HTTP calls que deben convertirse a declaraciones:
```typescript
// ❌ REMOVER del runtime (ejecución directa)
const response = await fetch(`http://localhost:${API_PORT}/fluxcore/runtime/rag-context`, {...});

// ✅ REEMPLAZAR CON - Declaración de intención (runtime)
return [{
  type: 'search_knowledge',
  query: args.query,
  vectorStoreIds: ctx.vectorStoreIds
}];

// ✅ EJECUTAR EN - ActionExecutor (sistema FluxCore)
if (action.type === 'search_knowledge') {
  const ragContext = await ragService.buildContext(action.query, action.vectorStoreIds);
  return await runtime.continueWithToolResult(toolCallId, ragContext);
}
```

### Certificación que debe centralizarse:
```typescript
// ❌ REMOVER - Runtime certifica individualmente
// ❌ REMOVER - Runtime ejecuta acciones directamente

// ✅ CENTRALIZAR EN - Sistema FluxCore
await cognitionGateway.certifyAiResponse(actions, triggerSignalId);
```

---

**Conclusión:** El runtime debe ser un "cerebro puro" que solo piensa y declara intenciones, construyendo sus propios prompts con su método específico. FluxCore es el "sistema nervioso" que provee servicios limitados (solo `llmClient`) y ejecuta esas intenciones. Cada runtime tiene su propia inteligencia cognitiva pero comparte el mismo sistema de ejecución.
