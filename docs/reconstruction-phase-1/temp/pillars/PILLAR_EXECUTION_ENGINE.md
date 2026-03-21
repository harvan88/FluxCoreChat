---
id: "pillar-execution-engine"
type: "subsystem"
status: "verified-codigo"
criticality: "high"
location: "apps/api/src/services/fluxcore/ y extensions/"
---

# Pillar: Execution Engine - FluxCore

**Fecha:** 2026-03-20  
**Propósito:** Motor de ejecución de herramientas y acciones de IA  
**Verificación:** ✅ Basado en código real  
**Archivos analizados:** Services de FluxCore y extensions

---

## 🎯 Descubrimiento Fundamental

### **El Execution Engine está distribuido entre múltiples componentes:**

#### **1. FluxCore Services (apps/api/src/services/fluxcore/)**
- **template-registry.service.ts** - Ejecución de plantillas
- **template-settings.service.ts** - Configuración de ejecución
- **cognition-gateway.service.ts** - Certificación de respuestas IA
- **rag-config.service.ts** - Configuración RAG

#### **2. Extensions (extensions/fluxcore-asistentes/)**
- **ToolRegistry** - Registro y ejecución de tools
- **tools/search-knowledge.ts** - Tool de búsqueda
- **send-template** - Tool de plantillas (integrado en registry)

#### **3. CognitionGateway (apps/api/src/core/)**
- **Punto de certificación** de acciones de IA
- **Interfaz única** para todos los runtimes

---

## 🏗️ Arquitectura del Execution Engine

### **Capa 1: Services de FluxCore (VERIFICADOS)**

#### **TemplateRegistryService**
```typescript
// apps/api/src/services/fluxcore/template-registry.service.ts
class TemplateRegistryService {
  async getAuthorizedTemplates(accountId: string): Promise<AuthorizedTemplate[]>
  async buildInstructionBlock(accountId: string): Promise<TemplateInstructionBlock | null>
  async canExecute(templateId: string, accountId: string): Promise<boolean>
}
```

#### **CognitionGatewayService**
```typescript
// apps/api/src/services/fluxcore/cognition-gateway.service.ts
class CognitionGatewayService {
  async certifyAiResponse(params: {
    conversationId: string;
    accountId: string;
    targetAccountId: string;
    content: { text: string };
    turnId: number;
    triggerSignalId?: number;
    runtimeId?: string;
  }): Promise<{ accepted: boolean; signalId?: number; reason?: string }>
}
```

#### **RAGConfigService**
```typescript
// apps/api/src/services/rag-config.service.ts
class RAGConfigService {
  async getEffectiveConfig(vectorStoreId: string, accountId: string): Promise<RAGConfig>
}
```

### **Capa 2: Tools en Extensions (VERIFICADAS)**

#### **search_knowledge Tool**
```typescript
// extensions/fluxcore-asistentes/src/tools/search-knowledge.ts
export const SEARCH_KNOWLEDGE_TOOL_DEF: OpenAIToolDef = {
  type: 'function',
  function: {
    name: 'search_knowledge',
    description: 'Busca información relevante en la base de conocimiento del asistente.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Consulta de búsqueda autosuficiente' }
      },
      required: ['query'],
    },
  },
};
```

#### **ToolRegistry Integration**
```typescript
// extensions/fluxcore-asistentes/src/tools/registry.ts
class ToolRegistry {
  getToolsForAssistant(context: ToolOfferContext): OpenAIToolDef[]
  executeToolCall(toolCall, context): ToolExecutionResponse
}
```

---

## 🔄 Flujo de Ejecución Real (VERIFICADO)

### **Paso 1: Runtime solicita tools**
```typescript
// En fluxcore-asistentes/src/index.ts
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

### **Paso 2: IA decide usar tool**
```typescript
// La IA recibe tools disponibles y decide ejecutar
// Por ejemplo: search_knowledge con query específica
```

### **Paso 3: ToolRegistry ejecuta**
```typescript
// ToolRegistry.executeToolCall() procesa la llamada
// Dependiendo del tool, llama al servicio correspondiente
```

### **Paso 4: Servicio FluxCore procesa**
```typescript
// TemplateRegistryService.canExecute() verifica permisos
// RAGConfigService.getEffectiveConfig() obtiene configuración
```

### **Paso 5: CognitionGateway certifica**
```typescript
// cognition-gateway.service.ts
const seq = await kernel.ingestSignal(candidate);
console.log(`[CognitionGateway] ✅ AI response certified as signal #${seq}`);
```

---

## 🔧 Componentes de Ejecución

### **1. Template Execution**
- **Validación:** `canExecute()` verifica autorización
- **Construcción:** `buildInstructionBlock()` genera prompt
- **Ejecución:** `sendTemplateTool()` envía plantilla

### **2. Knowledge Search**
- **Tool Definition:** `SEARCH_KNOWLEDGE_TOOL_DEF`
- **Query Processing:** `parseSearchKnowledgeArgs()`
- **System Instructions:** `SEARCH_KNOWLEDGE_SYSTEM_INSTRUCTION`

### **3. Response Certification**
- **Gateway:** `CognitionGatewayService`
- **Kernel Integration:** `kernel.ingestSignal()`
- **Telemetry:** Eventos de pipeline

---

## 🚨 Problemas Identificados

### **1. Ejecución Distribuida**
- **Services en API** vs **tools en extensions**
- **Doble capa** de ejecución
- **Posible duplicación** de lógica

### **2. Certificación Centralizada**
- **Solo CognitionGateway** puede certificar
- **Runtimes deben usar gateway**
- **Posible bottleneck**

### **3. Tool Registry Complejo**
- **Inyección de dependencias** manual
- **Múltiples servicios** coordinados
- **Difícil de testear**

---

## 📊 Estado Actual del Execution Engine

### **✅ FUNCIONAL:**
- [x] TemplateRegistryService implementado
- [x] CognitionGatewayService funcionando
- [x] ToolRegistry con tools básicas
- [x] RAGConfigService configurado

### **❌ PROBLEMAS:**
- [ ] Ejecución distribuida compleja
- [ ] Falta tool send-template verificada
- [ ] Posibles duplicaciones

---

## 🔗 Referencias Cruzadas

- **Template Registry:** `apps/api/src/services/fluxcore/template-registry.service.ts`
- **Cognition Gateway:** `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
- **RAG Config:** `apps/api/src/services/rag-config.service.ts`
- **Tool Registry:** `extensions/fluxcore-asistentes/src/tools/registry.ts`
- **Search Knowledge:** `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts`
- **Kernel:** `apps/api/src/core/kernel.ts`

---

## ❓ Preguntas Abiertas

### **Para el Usuario:**
1. **¿Quieres centralizar toda la ejecución?**
2. **¿Mantener la distribución actual?**
3. **¿Cómo simplificar el Tool Registry?**
4. **Qué herramientas faltan por implementar?**

### **Técnicas:**
1. **¿Cómo unificar services y tools?**
2. **¿Qué hacer con la duplicación?**
3. **¿Cómo mejorar la testabilidad?**

---

## 🚀 Próximos Pasos

### **Inmediato:**
1. **Documentar tool send-template** si existe
2. **Mapear todas las herramientas** disponibles
3. **Identificar duplicaciones** exactas

### **Mediano Plazo:**
1. **Decidir arquitectura de ejecución**
2. **Simplificar Tool Registry**
3. **Centralizar o distribuir** componentes
<tool_call>read_file
<arg_key>file_path</arg_key>
<arg_value>c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat\apps\api\src\services\fluxcore\template-registry.service.ts
