# Arquitectura de Pilares — Diseño Extensible desde el Código Real

**Fecha:** 2026-03-18  
**Propósito:** Definir cómo los runtimes acceden a capacidades del sistema de forma desacoplada y extensible  
**Fuentes:** Canon v8.3, Schema DB (`fluxcore-tools.ts`, `fluxcore-assistants.ts`), Extension (`fluxcore-asistentes/`), Runtimes actuales

---

## 1. Lo Que Ya Existe y Funciona (la base)

### 1.1 El Registro de Herramientas Ya Existe en BD

```
fluxcore_tool_definitions (catálogo global — "la librería")
  ├── slug: 'search_knowledge', 'templates', etc. (nombre canónico)
  ├── name: 'Base de Conocimiento', 'Plantillas', etc.
  ├── category: 'storage', 'communication', 'agenda', etc.
  ├── type: 'internal' | 'mcp' | 'http'
  ├── schema: { JSON Schema de parámetros }
  ├── authType: 'none' | 'oauth2' | 'api_key'
  ├── isBuiltIn: true/false
  └── isEnabled: true/false

fluxcore_tool_connections (la cuenta "se conecta" a la herramienta)
  ├── accountId → quién la habilitó
  ├── toolDefinitionId → cuál herramienta
  ├── status: 'connected' | 'disconnected' | 'error'
  └── authConfig: { credenciales si aplica }

fluxcore_assistant_tools (el asistente "vincula" la herramienta)
  ├── assistantId → cuál asistente
  ├── toolConnectionId → cuál conexión
  └── isEnabled: true/false
```

**Flujo de autorización existente:**
```
Librería (tool_definitions)
    → Cuenta se conecta (tool_connections)
        → Asistente la vincula (assistant_tools)
            → runtimeConfig.authorizedTools (llega al runtime)
```

### 1.2 El Tool Registry Ya Existe en Código (Extension)

En `extensions/fluxcore-asistentes/src/tools/registry.ts` ya existe un `ToolRegistry` funcional:

```typescript
class ToolRegistry {
  constructor(deps: ToolRegistryDeps) { }
  
  // Decide qué tools ofrecer al LLM según config del asistente
  getToolsForAssistant(context: { hasKnowledgeBase, hasTemplatesTool }): OpenAIToolDef[]
  
  // Ejecuta la tool cuando el LLM la llama
  executeToolCall(toolCall, context): ToolExecutionResponse
}
```

**Cómo funciona HOY (confirmado en código):**

1. El usuario configura su asistente y **habilita herramientas** (ej: vincula un vector store, habilita "templates")
2. Al recibir un turno, el sistema lee la composición del asistente (`active?.tools`, `active?.vectorStores`)
3. El `ToolRegistry.getToolsForAssistant()` arma la lista de tools para el LLM
4. Esas tools se envían al LLM como `OpenAIToolDef[]` → **la IA sabe que existen y cómo usarlas**
5. Si la IA decide usarlas, las llama → `ToolRegistry.executeToolCall()` las ejecuta
6. El resultado se inyecta como `role: 'tool'` y se hace una segunda llamada al LLM

**Ejemplo real de la inyección (línea 649-661 de la extensión):**
```typescript
// Tool registry: decide which tools are offered based on assistant config
const hasTemplatesTool = active!.tools.some(tool => tool?.slug === 'templates');
const toolRegistry = new ToolRegistry({
  fetchRagContext: this.fetchRAGContext.bind(this),
  listTemplates: this.listAuthorizedTemplates.bind(this),
  sendTemplate: this.sendTemplateTool.bind(this),
});
const llmTools = toolRegistry.getToolsForAssistant({
  hasKnowledgeBase: !!hasKnowledgeBase,
  hasTemplatesTool,
});
```

### 1.3 El Problema de las "1000 herramientas"

La IA NO lee todas las herramientas del sistema. Solo ve las que el **usuario habilitó para su asistente**. Esto ya funciona así:

```
                LIBRERÍA (puede tener 1000)
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
  search_knowledge  templates    calendar ...
          │             │
     ┌────┘        ┌────┘
     ▼             ▼
  Cuenta A lo    Cuenta A lo
  habilitó       habilitó
     │             │
     ▼             ▼
  Asistente X   Asistente X
  lo vinculó    lo vinculó
     │             │
     ▼             ▼
  runtimeConfig.authorizedTools: ['search_knowledge', 'templates']
     │
     ▼
  LLM recibe SOLO 2 tools → sabe qué puede usar → las llama si las necesita
```

La IA solo ve un **índice filtrado** con las instrucciones de las herramientas que el usuario eligió. Nunca ve las 1000.

---

## 2. Tone/Language/UseEmojis — Decisión de Diseño

### Lo que encontré en el código:

1. **En `fluxcore_assistants.modelConfig`** (schema BD): tone, language, useEmojis existen como campos opcionales
   ```typescript
   modelConfig: jsonb('model_config').$type<AssistantModelConfig & {
     tone?: string; language?: string; useEmojis?: boolean
   }>()
   ```

2. **En `FluxPolicyContext` (type actual)**: tone/language/useEmojis **NO están declarados**. La interface actual no tiene `attention` ni `presence` ni `commercial`.

3. **En `prompt-builder.ts` (extensión)**: Hay código que lee `policyContext.attention.tone`, `policyContext.attention.formality`, `policyContext.presence`, `policyContext.commercial` — pero **esto es código muerto** de una versión anterior del Canon (probablemente v7.0). Nunca se ejecuta porque `FluxPolicyContext` actual no tiene esos campos.

### La decisión del usuario (lo que me explicaste):

> FluxCore inyecta un slot en el perfil del usuario de ChatCore para que el usuario escoja characteristics de tono/idioma. ChatCore no conoce IA, pero el usuario configura en un lugar natural. Todos los runtimes pueden servirse de esas preferencias.

**Esto me parece correcto y se alinea con el Canon.** La secuencia sería:

```
ChatCore: Perfil del usuario
  └── "Preferencias de comunicación" (slot inyectado por FluxCore)
       ├── tone: 'formal' | 'amigable' | 'profesional'
       ├── language: 'es' | 'en' | 'pt'
       └── useEmojis: true/false

FluxCore: FluxPolicyContextService.resolveContext()
  └── Lee el perfil desde ChatCore (como hace con displayName, bio, etc.)
  └── Lo incluye en resolvedBusinessProfile.communicationPreferences
       (es dato del negocio autorizado, no config técnica del runtime)

Runtimes: Todos lo reciben via policyContext.resolvedBusinessProfile
  └── AsistentesLocal: Lo pone en el system prompt
  └── AsistentesOpenAI: Lo pone en instructionsOverride
  └── Fluxi: Lo usa para estilo de confirmaiones y preguntas
```

**¿Por qué en `resolvedBusinessProfile` y no en `RuntimeConfig`?** Porque es una preferencia del NEGOCIO (cómo quiere la empresa que se le hable a sus clientes), no del asistente individual. Si el usuario tiene dos asistentes, ambos deberían respetar que el negocio quiere tono "formal". Pero el Canon v8.3 dice que tone es del asistente... esto necesita tu confirmación.

**¿O prefieres que sea por asistente?** Si cada asistente pudiera tener diferente tono (uno formal, otro casual), entonces sí va en `RuntimeConfig` como está hoy en `modelConfig`.

---

## 3. La Confusión de PolicyContext: Mapeo Preciso

### Canon v8.3 §4.3 — Lo que DEBE contener PolicyContext:

| Campo | Propósito | ¿Está en el tipo actual? | ¿Se resuelve en el código? |
|-------|-----------|--------------------------|---------------------------|
| `accountId` | Identidad | ✅ | ✅ |
| `contactId` | Identidad | ✅ | ✅ |
| `conversationId` | Identidad | ✅ | ✅ |
| `channel` | Identidad | ✅ | ✅ |
| `mode` (auto/suggest/off) | Automatización | ✅ | ✅ |
| `responseDelayMs` | Automatización | ✅ | ✅ |
| `turnWindowMs` | Turno | ✅ | ✅ |
| `turnWindowTypingMs` | Turno | ✅ | ✅ |
| `turnWindowMaxMs` | Turno | ✅ | ✅ |
| `offHoursPolicy` | Negocio | ✅ | ✅ |
| `contactRules` | Negocio | ✅ | ✅ |
| `authorizedTemplates` | Autorización | ✅ | ⚠️ Siempre retorna `[]` |
| `resolvedBusinessProfile` | Datos autorizados | ✅ | ✅ |
| `activeWork` | Fluxi | ✅ (opcional) | ⚠️ Se resuelve pero no se asigna |
| `workDefinitions` | Fluxi | ✅ (opcional) | ⚠️ Se resuelve pero no se asigna |

### Canon v8.3 §4.3 — Lo que NO debe estar en PolicyContext:

| Campo | Razón | ¿Aparece en el tipo? | ¿Aparece en el código? |
|-------|-------|---------------------|----------------------|
| `tone` | Responsabilidad del asistente | ❌ No | ⚠️ `modelConfig.tone` en BD, código muerto en prompt-builder |
| `language` | Responsabilidad del asistente | ❌ No | ⚠️ `modelConfig.language` en BD, código muerto en prompt-builder |
| `useEmojis` | Responsabilidad del asistente | ❌ No | ⚠️ `modelConfig.useEmojis` en BD, código muerto en prompt-builder |
| `attention` | Concepto de Canon v7.0 eliminado | ❌ No | ⚠️ Código muerto en extension prompt-builder |
| `presence` | Concepto de Canon v7.0 eliminado | ❌ No | ⚠️ Código muerto en extension prompt-builder |
| `commercial` | Concepto de Canon v7.0 eliminado | ❌ No | ⚠️ Código muerto en extension prompt-builder |

### Diagnóstico:

**El tipo `FluxPolicyContext` está LIMPIO.** No tiene tone, attention, ni nada que no deba tener.

**El código muerto está en la EXTENSIÓN** (`extensions/fluxcore-asistentes/src/prompt-builder.ts` líneas 163-213), que lee `.attention.tone`, `.presence.businessHours`, `.commercial.catalog` — campos de una versión anterior que ya no existen en el tipo. Este código nunca se ejecuta porque el `policyContext` que llega no tiene esas propiedades.

**Conclusión:** El tipo canónico está bien. La extensión tiene código muerto que hay que limpiar.

---

## 4. ¿Qué Falta Reorganizar? (Lo que Toca desde que existe el Kernel)

### 4.1 La Extension Legacy vs El Runtime Nuevo

Hay **DOS implementaciones** del asistente local:

| | Extension (`fluxcore-asistentes/`) | Runtime (`runtimes/asistentes-local.runtime.ts`) |
|---|---|---|
| **Ubicación** | `extensions/fluxcore-asistentes/src/` | `apps/api/src/services/fluxcore/runtimes/` |
| **ToolRegistry** | ✅ Tiene `ToolRegistry` real | ❌ Tools hard-coded como constantes |
| **RAG** | Via `fetchRagContext()` (inyección o HTTP fallback) | Via `fetch()` HTTP directo |
| **Prompt** | `PromptBuilder` (versión extensión) | `promptBuilder.service.ts` (versión servicio) |
| **Tool Calling** | ✅ Loop completo con `ToolRegistry.executeToolCall()` | Loop with `executeTool()` manual |

**Esto confirma lo que me dijiste:** La extensión era el asistente original completo. Cuando se creó el runtime pipeline (Dispatcher → RuntimeGateway → ActionExecutor), se reescribió parte pero no todo. La extensión tiene el ToolRegistry más maduro.

### 4.2 Lo que necesita reorganizarse

```
                    ANTES (todo en la extensión)
┌───────────────────────────────────────────────┐
│ FluxCoreExtension (extensions/fluxcore-asist.)│
│                                               │
│  generateResponse()                           │
│    ├── fetchActiveAssistant() → HTTP/service   │
│    ├── ToolRegistry.getToolsForAssistant()     │
│    ├── promptBuilder.build()                   │
│    ├── createChatCompletion() → LLM            │
│    ├── ToolRegistry.executeToolCall()           │
│    │     ├── search_knowledge → HTTP RAG        │
│    │     ├── list_templates → HTTP/service      │
│    │     └── send_template → HTTP/service       │
│    └── return AISuggestion                      │
└───────────────────────────────────────────────┘

                    AHORA (pipeline + runtime + extensión coexisten)
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│CognitionWorker│──▶│CognitiveDispatcher│──▶│RuntimeGateway│
└──────────────┘    └──────────────────┘    └──────┬───────┘
                                                    │
                                         ┌──────────┴──────────┐
                                         ▼                     ▼
                              AsistentesLocalRuntime    FluxCoreExtension
                              (tools hardcoded,         (ToolRegistry,
                               fetch HTTP RAG)           HTTP fallbacks)
                                         │                     │
                                         ▼                     │
                              ActionExecutor ◀─────────────────┘
```

### 4.3 El Target (reorganizado)

```
CognitionWorker → Dispatcher → RuntimeGateway
                                      │
                               ┌──────┴──────────┐
                               ▼                  ▼
                    AsistentesLocalRuntime    AsistentesOpenAI ...
                               │
                    Recibe RuntimeInput:
                    ├── policyContext (gobernanza)
                    ├── runtimeConfig (técnico)
                    ├── conversationHistory
                    └── services: RuntimeServices
                              ├── llmClient (built-in)
                              ├── toolRegistry.getAvailableTools()
                              └── toolRegistry.executeTool(slug, params)
                               │
                    Retorna: ExecutionAction[]
                               │
                               ▼
                         ActionExecutor
```

---

## 5. Diseño del ToolRegistry Refactorizado

### Principio: El runtime no conoce implementaciones, conoce contratos

```typescript
// ❌ HOY en la extensión: deps hard-coded
const toolRegistry = new ToolRegistry({
  fetchRagContext: this.fetchRAGContext.bind(this),
  listTemplates: this.listAuthorizedTemplates.bind(this),
  sendTemplate: this.sendTemplateTool.bind(this),
});

// ✅ TARGET: registry lee de BD + implementaciones registradas
const services: RuntimeServices = {
  llmClient: llmClientService,
  toolRegistry: toolRegistryService.forAssistant(assistantId, accountId),
};
```

### Interface `RuntimeServices`

```typescript
export interface RuntimeServices {
  /**
   * LLM Client — siempre disponible (built-in)
   */
  llmClient: {
    complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
  };
  
  /**
   * Tool Registry — descubrimiento y ejecución de herramientas
   * Filtrado por asistente: solo las tools que el usuario habilitó.
   */
  toolRegistry: {
    /**
     * ¿Qué tools tengo disponibles? (para enviar al LLM)
     * Solo devuelve las vinculadas al asistente activo.
     * La IA ve 2-3 tools, no 1000.
     */
    getAvailableTools(): ToolForLLM[];
    
    /**
     * Ejecutar una tool por slug canónico.
     * El runtime no sabe cómo se implementa — solo la llama.
     * Mañana puede haber 'get_business_hours' sin tocar el runtime.
     */
    executeTool(slug: string, params: Record<string, unknown>): Promise<ToolResult>;
  };
}

interface ToolForLLM {
  slug: string;
  name: string;
  description: string;
  category: 'query' | 'effect';  // Query Service vs Effect Action
  parameters: Record<string, unknown>;  // JSON Schema para el LLM
}

interface ToolResult {
  outcome: 'success' | 'not_found' | 'error';
  data?: unknown;
  message?: string;
}
```

### Cómo el Dispatcher construye los services

```typescript
// En CognitiveDispatcher.dispatch():
const services: RuntimeServices = {
  llmClient: llmClientService,
  toolRegistry: toolRegistryService.forAssistant(
    runtimeConfig.assistantId,
    policyContext.accountId
  ),
};

const runtimeInput: RuntimeInput = {
  policyContext,
  runtimeConfig,
  conversationHistory,
  services,
  triggerSignalId,
};
```

### Cómo el ToolRegistryService resuelve tools

```typescript
class ToolRegistryService {
  /**
   * Crea una instancia del registry filtrada por asistente.
   * Lee de BD: tool_definitions JOIN tool_connections JOIN assistant_tools
   */
  forAssistant(assistantId: string, accountId: string): AssistantToolRegistry {
    // 1. Consulta las tools vinculadas a este asistente
    // 2. Resuelve sus definiciones (slug, schema, category)
    // 3. Retorna registry filtrado con solo esas tools
  }
}

class AssistantToolRegistry {
  getAvailableTools(): ToolForLLM[] {
    // Retorna solo las tools vinculadas a este asistente
    // Cada una con su JSON Schema para el LLM
  }
  
  async executeTool(slug: string, params: Record<string, unknown>): Promise<ToolResult> {
    // Despacha al ejecutor correcto según el slug:
    // 'search_knowledge' → retrievalService.buildContext(...)
    // 'list_templates' → templateRegistryService.getAuthorized(...)
    // 'send_template' → templateService.send(...)
    // 'get_business_hours' → accountService.getHours(...)  ← FUTURO
    // 'user_custom_mcp' → mcpClient.call(...)              ← FUTURO
  }
}
```

**Extensibilidad lograda:** Mañana se agrega `get_business_hours`:
1. Se registra en `fluxcore_tool_definitions` (slug, schema, category='query')
2. Se implementa el ejecutor (una función que lee horarios de ChatCore)
3. Se registra el ejecutor en `ToolRegistryService`
4. La cuenta se conecta, el asistente lo vincula
5. **El runtime NO se toca.** `getAvailableTools()` lo devuelve automáticamente. El LLM lo usa. `executeTool('get_business_hours')` lo ejecuta.

---

## 6. Invariantes del Diseño

### I.1: Soberanía Cognitiva
El Runtime decide QUÉ herramientas usar y CUÁNDO usarlas. El sistema decide CÓMO se ejecutan y QUIÉN puede usarlas.

### I.2: Mediación Obligatoria
Ningún Runtime accede directamente a infraestructura. Toda capacidad pasa por `services.toolRegistry` o `services.llmClient`.

### I.3: Extensibilidad sin Refactoring
Agregar una herramienta nueva NUNCA requiere modificar un runtime existente. Solo requiere: registro en BD + implementación del ejecutor + vinculación del usuario.

### I.4: Filtrado por Asistente
La IA solo ve las herramientas que el usuario habilitó para su asistente específico. El catálogo puede tener 1000 → la IA ve 2-3.

### I.5: Query vs Effect
- **Query Tools** (search_knowledge, get_business_hours): Se ejecutan DURANTE handleMessage(). Resultado se inyecta como contexto. NO producen efectos.
- **Effect Tools** (send_template, create_appointment): Se declaran como `ExecutionAction[]`. El ActionExecutor las ejecuta DESPUÉS. Producen cambios en el mundo.

---

## 7. Roadmap T1 Actualizado

### T1-A: Cartografía ✅ (este documento)
- Confirmado: Registro en BD existe, ToolRegistry en extension existe
- Confirmado: PolicyContext type está limpio, prompt-builder extension tiene código muerto
- Confirmado: Dos implementaciones del asistente local (extension + runtime)

### T1-B: Limpiar código muerto
1. Eliminar `attention.tone`, `presence`, `commercial` del prompt-builder de la extensión
2. Decidir tone/language/useEmojis: ¿perfil ChatCore o por asistente? → pendiente confirmación

### T1-C: Crear ToolRegistryService (servicio central)
1. Lee de BD: `fluxcore_tool_definitions` → `tool_connections` → `assistant_tools`
2. Método `forAssistant(assistantId, accountId)` retorna tools filtradas
3. Registra ejecutores por slug (search_knowledge, templates, etc.)
4. Migra la lógica de `ToolRegistry` de la extensión a este servicio central

### T1-D: Definir RuntimeServices interface
1. `llmClient` (built-in, siempre disponible)
2. `toolRegistry.getAvailableTools()` (filtrado por asistente)
3. `toolRegistry.executeTool(slug, params)` (dispatch por slug)

### T1-E: Refactoring de AsistentesLocalRuntime
1. Consume `services.llmClient` en vez de import directo
2. Consume `services.toolRegistry.getAvailableTools()` en vez de constantes hard-coded
3. Consume `services.toolRegistry.executeTool()` en vez de `fetch()` HTTP
4. Internaliza PromptBuilder (es lógica del piso)

### T1-F: Unificar extensión + runtime
1. El runtime asume la responsabilidad completa del asistente local
2. La extensión queda como wrapper/adaptador legacy o se elimina
3. El ToolRegistry de la extensión migra al servicio central

### T1-G: Tests anti-regresión
1. Nueva tool registrada aparece en `getAvailableTools()` sin cambiar runtime
2. Tool no vinculada al asistente NO aparece
3. Runtime no importa directamente `llmClient`, `fetch()`, ni constantes de tools

---

## 8. Preguntas Pendientes

| # | Pregunta | Estado |
|---|----------|--------|
| **T1.2** | **¿RuntimeInput.services con toolRegistry confirmas?** Cada turno recibe los pilares inyectados. Stateless, testeable. | ⏳ Pendiente |
| **T1.12** | **¿Tone/language/useEmojis vive en perfil ChatCore (para TODOS los runtimes) o en modelConfig del asistente (por asistente)?** Tu explicación sugiere perfil ChatCore. | ⏳ Pendiente |
| **T1.13** | **¿La extensión `fluxcore-asistentes` se depreca a favor del runtime, o coexisten?** Hoy hay dos implementaciones del mismo asistente local. | ⏳ Pendiente |

---

*Documento desde el código real + contexto histórico del usuario.*  
*Perspectiva extensible: herramientas se registran, el runtime las descubre.*
