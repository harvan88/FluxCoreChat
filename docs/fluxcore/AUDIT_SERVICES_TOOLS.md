# Auditoría H0.5: Servicios y Herramientas

**Fecha:** 2026-02-17  
**Objetivo:** Identificar servicios de ChatCore que deben exponerse como herramientas y servicios de FluxCore reutilizables

---

## 1. TEST ONTOLÓGICO PARA HERRAMIENTAS

### 1.1 Criterio de Clasificación

**Pregunta:** ¿Esta funcionalidad existiría si no hubiera IA en el sistema?

- **SÍ** → Servicio de ChatCore → Exponer como herramienta
- **NO** → Servicio de FluxCore → Puede ser herramienta o servicio interno

### 1.2 Modelo de Registro (Canon v8.2 sección 4.8)

```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: unknown, context: PolicyContext) => Promise<unknown>;
}
```

**Principio:** FluxCore mantiene el registro de herramientas y media el acceso. El runtime declara la intención, el `ActionExecutor` ejecuta.

---

## 2. SERVICIOS DE CHATCORE (CANDIDATOS A HERRAMIENTAS)

### 2.1 Template Service

**Archivo:** `apps/api/src/services/template.service.ts`

#### ✅ REUTILIZABLE COMO HERRAMIENTA

**Métodos relevantes:**
- `listTemplates(accountId)` → Herramienta `list_available_templates`
- `getTemplate(accountId, templateId)` → Interno
- `executeTemplate(params)` → Herramienta `send_template`

**Análisis:**
- ✅ No tiene lógica de IA (líneas 1-332)
- ✅ Opera sobre tablas de ChatCore (`templates`, `template_assets`)
- ✅ Método `executeTemplate()` llama a `messageCore.send()` (línea 168)

**Problema detectado:** `executeTemplate()` ejecuta efectos directamente. Según Canon, debe ser invocado por `ActionExecutor`, no por runtime.

**Refactor requerido:**
```typescript
// ACTUAL (línea 168)
await messageCore.send({...});

// REQUERIDO
// ActionExecutor invoca templateService.executeTemplate()
// Runtime devuelve acción { type: 'send_template', templateId, variables }
```

**Herramientas a registrar:**

**1. `list_available_templates`**
```typescript
{
  id: 'list_available_templates',
  name: 'Listar plantillas disponibles',
  description: 'Obtiene lista de plantillas que el usuario puede usar',
  parameters: {
    type: 'object',
    properties: {
      accountId: { type: 'string' }
    },
    required: ['accountId']
  },
  execute: async (params, context) => {
    return await templateService.listTemplates(context.accountId);
  }
}
```

**2. `send_template`**
```typescript
{
  id: 'send_template',
  name: 'Enviar plantilla',
  description: 'Envía una plantilla con variables reemplazadas',
  parameters: {
    type: 'object',
    properties: {
      templateId: { type: 'string' },
      conversationId: { type: 'string' },
      variables: { type: 'object' }
    },
    required: ['templateId', 'conversationId']
  },
  execute: async (params, context) => {
    // Validar que template esté en context.authorizedTemplates
    if (!context.authorizedTemplates.includes(params.templateId)) {
      throw new Error('Template not authorized');
    }
    return await templateService.executeTemplate({
      accountId: context.accountId,
      templateId: params.templateId,
      conversationId: params.conversationId,
      variables: params.variables,
      generatedBy: 'ai'
    });
  }
}
```

**Acción requerida:** H8 - Registrar herramientas en ToolRegistry.

### 2.2 Conversation Service

**Archivo:** `apps/api/src/services/conversation.service.ts`

#### ⚠️ EVALUAR: ¿Necesario como herramienta?

**Métodos:**
- `createConversation()`
- `getConversation()`
- `updateConversation()`

**Análisis:** Los runtimes no crean conversaciones directamente. Las conversaciones se crean por proyectores o por acciones de usuario.

**Conclusión:** NO es herramienta. Es servicio interno de ChatCore.

### 2.3 Relationship Service

**Archivo:** `apps/api/src/services/relationship.service.ts`

#### ❌ NO ES HERRAMIENTA

**Análisis:** Gestiona relaciones entre cuentas. No es invocable por runtimes.

**Conclusión:** Servicio interno de ChatCore.

### 2.4 Message Service

**Archivo:** `apps/api/src/services/message.service.ts`

#### ❌ NO ES HERRAMIENTA

**Análisis:** Servicio de bajo nivel para persistencia. Los runtimes devuelven acciones `send_message`, no llaman a `messageService` directamente.

**Conclusión:** Servicio interno usado por `ActionExecutor`.

---

## 3. SERVICIOS DE FLUXCORE (REUTILIZABLES)

### 3.1 AI Service

**Archivo:** `apps/api/src/services/ai.service.ts`

#### ✅ REUTILIZABLE (con refactor)

**Métodos relevantes:**
- `generateResponse()` - usado por AsistentesLocal
- `complete()` - cliente LLM directo
- `getAccountConfig()` - ❌ debe eliminarse de runtimes

**Análisis:**
- ✅ `generateResponse()` integra ExecutionPlan, PromptBuilder, LLM
- ✅ `complete()` es cliente LLM puro
- ❌ `getAccountConfig()` viola soberanía (debe venir en PolicyContext)

**Componentes reutilizables:**
- Cliente LLM (Groq, OpenAI)
- Lógica de ExecutionPlan (ya implementada)
- Integración con aiEntitlementsService

**Refactor requerido:**
- Eliminar llamadas a `getAccountConfig()` desde runtimes
- Mover configuración a `PolicyContext`

**Acción requerida:** H3 - Refactorizar para usar PolicyContext.

### 3.2 RAG / Retrieval Service

**Archivo:** `apps/api/src/services/retrieval.service.ts`

#### ✅ REUTILIZABLE COMO HERRAMIENTA

**Métodos:**
- `search(query, vectorStoreIds, accountId, options)`

**Análisis:**
- ✅ No tiene lógica de IA (es servicio de búsqueda)
- ✅ Usa pgvector para búsqueda semántica
- ✅ Puede recibir PolicyContext para configuración

**Herramienta a registrar:**

**`search_knowledge`**
```typescript
{
  id: 'search_knowledge',
  name: 'Buscar en base de conocimiento',
  description: 'Busca información relevante en vector stores autorizados',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      topK: { type: 'number', default: 5 },
      minScore: { type: 'number', default: 0.3 }
    },
    required: ['query']
  },
  execute: async (params, context) => {
    // Usar vector stores autorizados del PolicyContext
    const vectorStoreIds = context.authorizedVectorStores || [];
    return await retrievalService.search(
      params.query,
      vectorStoreIds,
      context.accountId,
      {
        topK: params.topK,
        minScore: params.minScore
      }
    );
  }
}
```

**Nota:** Según Canon v8.2, `search_knowledge` puede invocarse síncronamente durante `handleMessage` (servicios inyectados permitidos).

**Acción requerida:** H3 - Inyectar en AsistentesLocalRuntime.

### 3.3 RAG Config Service

**Archivo:** `apps/api/src/services/rag-config.service.ts`

#### ❌ NO ES HERRAMIENTA

**Análisis:** Servicio de configuración, no invocable por runtimes.

**Conclusión:** Servicio interno de FluxCore.

### 3.4 FluxCore Service

**Archivo:** `apps/api/src/services/fluxcore.service.ts`

#### ⚠️ EVALUAR: Asistentes

**Métodos:**
- `resolveActiveAssistant()`
- `getAssistant()`
- `createAssistant()`

**Análisis:** Estos métodos resuelven configuración de asistentes. Según Canon, esta información debe venir en `PolicyContext`.

**Refactor requerido:**
- `PolicyContext.assistantInstructions` (para Asistentes Local)
- `PolicyContext.assistantExternalId` (para Asistentes OpenAI)

**Acción requerida:** H2 - Mover resolución de asistente a `FluxPolicyContextService`.

### 3.5 Flux Policy Context Service

**Archivo:** `apps/api/src/services/flux-policy-context.service.ts`

#### ✅ CRÍTICO PARA V8.2

**Análisis:** Este servicio ya existe y resuelve `PolicyContext`.

**Verificación requerida:**
- ¿Resuelve todos los campos requeridos por Canon?
- ¿Lee de `extension_installations.config`?
- ¿Incluye `turnWindowMs`, `mode`, `tone`, etc.?

**Acción requerida:** H2 - Auditar y completar `FluxPolicyContextService`.

### 3.6 Work Engine Service

**Archivo:** `apps/api/src/services/work-engine.service.ts`

#### ✅ EXISTE - PARA FLUXI

**Análisis:** Servicio de Work Engine ya implementado (21KB).

**Verificación requerida:**
- ¿Cumple con Canon v8.2 sección 4.7.3?
- ¿Recibe dependencias por inyección?
- ¿No accede a DB directamente?

**Acción requerida:** H4 - Auditar Work Engine contra Canon.

---

## 4. SERVICIOS LEGACY A ELIMINAR

### 4.1 AI Orchestrator (Old)

**Archivo:** `apps/api/src/services/ai-orchestrator.old.ts`

#### ❌ ELIMINAR EN H7

**Análisis:** Archivo legacy de 26KB. Ya existe `.old` en el nombre.

**Acción requerida:** H7 - Eliminar junto con ExtensionHost.

### 4.2 Extension Host Service

**Archivo:** `apps/api/src/services/extension-host.service.ts`

#### ❌ ELIMINAR EN H7

**Análisis:** Orquestador legacy de extensiones. Reemplazado por RuntimeGateway.

**Acción requerida:** H7 - Eliminar.

### 4.3 Message Dispatch Service

**Archivo:** `apps/api/src/services/message-dispatch.service.ts`

#### ❌ ELIMINAR EN H7

**Análisis:** Dispatcher legacy. Reemplazado por CognitiveDispatcher.

**Acción requerida:** H7 - Eliminar.

---

## 5. SERVICIOS AUXILIARES REUTILIZABLES

### 5.1 AI Entitlements Service

**Archivo:** `apps/api/src/services/ai-entitlements.service.ts`

#### ✅ REUTILIZABLE

**Análisis:** Gestiona entitlements de providers. Usado por ExecutionPlan.

**Acción requerida:** NINGUNA. Ya integrado.

### 5.2 Credits Service

**Archivo:** `apps/api/src/services/credits.service.ts`

#### ✅ REUTILIZABLE

**Análisis:** Gestiona créditos. Usado por ExecutionPlan.

**Acción requerida:** NINGUNA. Ya integrado.

### 5.3 AI Trace Service

**Archivo:** `apps/api/src/services/ai-trace.service.ts`

#### ✅ REUTILIZABLE

**Análisis:** Logging y trazabilidad de invocaciones a LLM.

**Acción requerida:** NINGUNA. Mantener para auditoría.

### 5.4 Smart Delay Service

**Archivo:** `apps/api/src/services/smart-delay.service.ts`

#### ⚠️ EVALUAR: ¿Necesario?

**Análisis:** Scheduling de respuestas con debounce. Actualmente embebido en FluxCoreRuntimeAdapter.

**Opciones:**
1. Eliminar y usar `PolicyContext.responseDelayMs`
2. Mover a `CognitionWorker` (scheduling antes de invocar runtime)
3. Mover a `ActionExecutor` (scheduling después de recibir acciones)

**Recomendación:** Opción 1 - Simplificar usando `responseDelayMs`.

**Acción requerida:** H3 - Evaluar si SmartDelay es crítico para UX.

---

## 6. REGISTRO DE HERRAMIENTAS (TOOLREGISTRY)

### 6.1 Herramientas Identificadas

**ChatCore (existirían sin IA):**
1. `list_available_templates` - Lista plantillas
2. `send_template` - Envía plantilla con variables
3. `get_contact_notes` - Lee notas del contacto (si existe servicio)

**FluxCore (no existirían sin IA):**
4. `search_knowledge` - Búsqueda en vector stores

**Sistemas Externos (ejemplos):**
5. `create_appointment` - Crear cita en sistema externo
6. `search_products` - Buscar productos en catálogo

### 6.2 Implementación de ToolRegistry

**Archivo a crear:** `apps/api/src/services/fluxcore/tool-registry.service.ts`

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
  
  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }
  
  get(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }
  
  listAuthorized(context: PolicyContext): Tool[] {
    return Array.from(this.tools.values())
      .filter(tool => context.authorizedTools.includes(tool.id));
  }
  
  async execute(toolId: string, params: unknown, context: PolicyContext): Promise<unknown> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    
    if (!context.authorizedTools.includes(toolId)) {
      throw new Error(`Tool ${toolId} not authorized`);
    }
    
    return await tool.execute(params, context);
  }
}

export const toolRegistry = new ToolRegistry();
```

**Acción requerida:** H8 - Implementar ToolRegistry y registrar herramientas.

---

## RESUMEN EJECUTIVO

### Servicios de ChatCore (Herramientas)

| Servicio | Herramientas | Estado | Acción |
|---|---|---|---|
| TemplateService | `list_available_templates`, `send_template` | ✅ Listo | H8 - Registrar |
| ConversationService | - | ❌ No es herramienta | Ninguna |
| RelationshipService | - | ❌ No es herramienta | Ninguna |
| MessageService | - | ❌ No es herramienta | Ninguna |

### Servicios de FluxCore (Reutilizables)

| Servicio | Uso | Estado | Acción |
|---|---|---|---|
| AIService | LLM client, ExecutionPlan | ✅ Reutilizable | H3 - Refactor |
| RetrievalService | `search_knowledge` | ✅ Herramienta | H3 - Inyectar |
| FluxPolicyContextService | Resolver PolicyContext | ✅ Crítico | H2 - Auditar |
| WorkEngineService | Fluxi FSM | ⚠️ Verificar | H4 - Auditar |
| AIEntitlementsService | Providers | ✅ Integrado | Ninguna |
| CreditsService | Créditos | ✅ Integrado | Ninguna |
| AITraceService | Logging | ✅ Mantener | Ninguna |

### Servicios Legacy (Eliminar)

| Servicio | Acción |
|---|---|
| ai-orchestrator.old.ts | H7 - Eliminar |
| extension-host.service.ts | H7 - Eliminar |
| message-dispatch.service.ts | H7 - Eliminar |

### Herramientas a Implementar (H8)

1. **ToolRegistry** - Registro central de herramientas
2. **list_available_templates** - Wrapper sobre templateService
3. **send_template** - Wrapper sobre templateService.executeTemplate
4. **search_knowledge** - Wrapper sobre retrievalService

### Componentes Críticos a Auditar

1. **FluxPolicyContextService** (H2) - Verificar que resuelve todos los campos del Canon
2. **WorkEngineService** (H4) - Verificar cumplimiento con Canon Fluxi
3. **SmartDelayService** (H3) - Evaluar si es necesario o simplificar

---

## PLAN DE ACCIÓN

### H2 (Infraestructura)
- Auditar `FluxPolicyContextService`
- Verificar que resuelve: `mode`, `tone`, `turnWindowMs`, `assistantInstructions`, etc.
- Completar campos faltantes

### H3 (Asistentes Local)
- Inyectar `retrievalService` en AsistentesLocalRuntime
- Eliminar llamadas a `aiService.getAccountConfig()`
- Evaluar SmartDelay (mantener o simplificar)

### H4 (Fluxi)
- Auditar `WorkEngineService` contra Canon v8.2 sección 4.7.3
- Verificar que recibe dependencias por inyección
- Verificar que no accede a DB directamente

### H8 (Herramientas)
- Implementar `ToolRegistry`
- Registrar herramientas de ChatCore (`list_available_templates`, `send_template`)
- Registrar herramientas de FluxCore (`search_knowledge`)
- Integrar ToolRegistry en ActionExecutor

---

## ESTIMADO DE TRABAJO

**H2:** 0 días adicionales (auditoría de PolicyContext incluida)

**H3:** 0 días adicionales (inyección de retrieval incluida)

**H4:** 1-2 días adicionales (auditoría de WorkEngine)

**H8:** 5-7 días (según plan original)

**Total:** No cambia estimado global. H8 ya estaba planificado.

---

## RIESGOS IDENTIFICADOS

### RIESGO MEDIO

**WorkEngineService puede no cumplir Canon:** Si el Work Engine actual accede a DB directamente, requerirá refactor significativo.

**Mitigación:** Auditoría en H4 antes de comenzar implementación de Fluxi.

### RIESGO BAJO

**SmartDelay puede ser crítico para UX:** Eliminarlo puede afectar experiencia.

**Mitigación:** Evaluar métricas de uso antes de decidir.

---

## CONCLUSIÓN

Los servicios existentes están bien separados entre ChatCore y FluxCore. La mayoría son reutilizables con refactors menores.

**Servicios 100% reutilizables:**
- TemplateService (como herramienta)
- RetrievalService (como herramienta)
- AIEntitlementsService
- CreditsService
- AITraceService

**Servicios que requieren refactor:**
- AIService (eliminar getAccountConfig)
- FluxPolicyContextService (completar campos)
- WorkEngineService (auditar soberanía)

**Servicios a eliminar:**
- ai-orchestrator.old.ts
- extension-host.service.ts
- message-dispatch.service.ts

**Estimado:** No cambia. El trabajo de H8 ya estaba planificado.
