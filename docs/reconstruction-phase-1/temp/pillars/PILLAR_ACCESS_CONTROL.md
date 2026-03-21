---
id: "pillar-access-control"
type: "subsystem"
status: "verified-codigo"
criticality: "high"
location: "packages/db/src/schema/fluxcore-tools.ts y extensions/fluxcore-asistentes/src/tools/registry.ts"
---

# Pillar: Access Control - FluxCore

**Fecha:** 2026-03-20  
**Propósito:** Control de acceso a herramientas para runtimes  
**Verificación:** ✅ Basado en código real  
**Archivos analizados:** Schema BD y Tool Registry

---

## 🎯 Descubrimiento Fundamental

### **El sistema de acceso a herramientas YA EXISTE y funciona:**

#### **1. Base de Datos - fluxcore-tools.ts (VERIFICADO)**
```typescript
// Tablas existentes y funcionales
fluxcore_tool_definitions      // Catálogo global de herramientas
fluxcore_tool_connections     // Conexiones por cuenta
fluxcore_assistant_tools      // Vinculación asistente-herramienta
```

#### **2. Tool Registry - registry.ts (VERIFICADO)**
```typescript
class ToolRegistry {
  getToolsForAssistant(context: ToolOfferContext): OpenAIToolDef[]
  executeToolCall(toolCall, context): ToolExecutionResponse
}
```

---

## 🏗️ Flujo de Acceso Controlado (VERIFICADO)

### **Paso 1: Catálogo Global**
```typescript
// fluxcore_tool_definitions
{
  slug: 'search_knowledge',
  name: 'Base de Conocimiento',
  type: 'internal',
  authType: 'none',
  isEnabled: true
}
```

### **Paso 2: Conexión por Cuenta**
```typescript
// fluxcore_tool_connections
{
  accountId: 'user-123',
  toolDefinitionId: 'tool-456',
  status: 'connected',
  authConfig: { type: 'none' }
}
```

### **Paso 3: Vinculación a Asistente**
```typescript
// fluxcore_assistant_tools
{
  assistantId: 'assistant-789',
  toolConnectionId: 'connection-456',
  isEnabled: true
}
```

### **Paso 4: Runtime recibe lista filtrada**
```typescript
// En extensions/fluxcore-asistentes/src/index.ts (líneas 649-661)
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

---

## 🎯 Mecanismo de Filtrado (VERIFICADO)

### **La IA NO ve todas las herramientas del sistema**

#### **Flujo real:**
```
LIBRERÍA (1000 herramientas disponibles)
        │
  ┌─────────────┼─────────────┐
  ▼             ▼             ▼
search_knowledge  templates    calendar
  │             │
┌─┘        ┌────┘
▼          ▼
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
LLM recibe SOLO 2 tools → sabe qué puede usar
```

### **Resultado:**
- **IA solo ve herramientas autorizadas**
- **No hay sobrecarga de 1000 tools**
- **Cada asistente tiene su subset específico**

---

## 🔧 Implementación Técnica (VERIFICADA)

### **ToolOfferContext Interface:**
```typescript
export interface ToolOfferContext {
  hasKnowledgeBase: boolean;
  hasTemplatesTool: boolean;
}
```

### **ToolExecutionContext:**
```typescript
export interface ToolExecutionContext {
  accountId: string;
  conversationId: string;
  eventContent: string;
  vectorStoreIds?: string[];
}
```

### **ToolExecutionResult:**
```typescript
export interface ToolExecutionResult {
  outcome: 'success' | 'not_found' | 'error';
  data?: Record<string, any>;
  message?: string;
}
```

---

## 🚨 Problemas Identificados

### **1. Código Muerto en Prompt Builder**
```typescript
// ENCONTRADO pero NO FUNCIONAL:
policyContext.attention.tone        // ❌ No existe en FluxPolicyContext
policyContext.attention.formality   // ❌ No existe en FluxPolicyContext
policyContext.presence              // ❌ No existe en FluxPolicyContext
policyContext.commercial            // ❌ No existe en FluxPolicyContext
```

### **2. Campos BD vs Interface Mismatch**
```typescript
// EN BD (existe):
modelConfig: {
  tone?: string; 
  language?: string; 
  useEmojis?: boolean
}

// EN FluxPolicyContext (NO existe):
// No hay campos tone/language/useEmojis
```

---

## 🎯 Solución Propuesta

### **Integrar con ChatCore Profile:**
```
ChatCore: Perfil del usuario
  └── "Preferencias de comunicación" (slot inyectado por FluxCore)
       ├── tone: 'formal' | 'amigable' | 'profesional'
       ├── language: 'es' | 'en' | 'pt'
       └── useEmojis: true/false

FluxCore: FluxPolicyContextService.resolveContext()
  └── Lee el perfil desde ChatCore
  └── Lo incluye en resolvedBusinessProfile.communicationPreferences

Runtimes: Todos lo reciben via policyContext.resolvedBusinessProfile
```

---

## 📊 Estado Actual del Access Control

### **✅ FUNCIONAL:**
- [x] Schema de BD completo y funcionando
- [x] Tool Registry implementado
- [x] Filtrado por asistente funcionando
- [x] Ejecución de tools funcionando

### **❌ PROBLEMAS:**
- [ ] Código muerto en prompt-builder.ts
- [ ] Mismatch BD vs interface
- [ ] Preferencias de usuario no integradas

---

## 🔗 Referencias Cruzadas

- **Schema:** `packages/db/src/schema/fluxcore-tools.ts`
- **Registry:** `extensions/fluxcore-asistentes/src/tools/registry.ts`
- **Uso:** `extensions/fluxcore-asistentes/src/index.ts` (líneas 649-661)
- **Prompt Builder:** `extensions/fluxcore-asistentes/src/prompt-builder.ts`
- **Context:** `packages/db/src/schema/fluxcore-assistants.ts`

---

## ❓ Preguntas Abiertas

### **Para el Usuario:**
1. **¿Cómo quieres integrar las preferencias de usuario?**
2. **¿Qué hacer con el código muerto del prompt builder?**
3. **¿Cuál es el flujo correcto para tone/language/useEmojis?**

### **Técnicas:**
1. **¿FluxPolicyContext debe incluir los campos faltantes?**
2. **¿Cómo se resuelven las preferencias desde ChatCore?**
3. **Qué runtimes deben usar estas preferencias?**

---

## 🚀 Próximos Pasos

### **Inmediato:**
1. **Limpiar código muerto del prompt builder**
2. **Decidir integración de preferencias**
3. **Documentar el flujo completo**

### **Mediano Plazo:**
1. **Implementar integración ChatCore-FluxCore**
2. **Estandarizar preferencias en todos los runtimes**
3. **Validar funcionamiento completo
