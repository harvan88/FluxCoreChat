---
id: "tools-subsystem"
type: "subsystem"
status: "needs_review"
criticality: "high"
location: "apps/api/src/services/template.service.ts y apps/api/src/services/fluxcore/template-registry.service.ts"
---

# Tools Subsystem - FluxCore

**Fecha:** 2026-03-20  
**Propósito:** Sistema doble de herramientas - ChatCore (humanos) vs FluxCore (IA)  
**Verificación:** ✅ Basado en código real  
**Arquitectura:** Dos sistemas paralelos con propósitos diferentes

---

## 🎯 Propósito

El sistema de tools está **duplicado intencionalmente** entre ChatCore y FluxCore, cada uno optimizado para su audiencia específica:

### ChatCore Tools (Humanos):
- **Propósito:** Herramientas para uso humano directo
- **UI:** Componentes visuales, formularios, botones
- **Ejecución:** `template.service.ts`

### FluxCore Tools (IA):
- **Propósito:** Herramientas para consumo por IA
- **UI:** Sin interfaz, solo definiciones estructuradas
- **Ejecución:** `template-registry.service.ts`

---

## 🏗️ Arquitectura

### ChatCore Tools System:
```typescript
// apps/api/src/services/template.service.ts
class TemplateService {
  async executeTemplate(params: {
    accountId: string;
    templateId: string;
    conversationId: string;
    variables?: Record<string, string>;
    generatedBy?: 'human' | 'ai';
  })
}
```

### FluxCore Tools System:
```typescript
// apps/api/src/services/fluxcore/template-registry.service.ts
class TemplateRegistryService {
  async getAuthorizedTemplates(accountId: string): Promise<AuthorizedTemplate[]>
  async buildInstructionBlock(accountId: string): Promise<TemplateInstructionBlock | null>
  async canExecute(templateId: string, accountId: string): Promise<boolean>
}
```

---

## 📊 Diferencias Fundamentales

### 1. Propósito y Audiencia:
- **ChatCore:** Humanos → UI completa, visual, interactiva
- **FluxCore:** IA → Definiciones estructuradas, sin UI

### 2. Ejecución:
- **ChatCore:** `executeTemplate()` - Ejecución directa con UI
- **FluxCore:** `canExecute()` + `buildInstructionBlock()` - Validación y preparación

### 3. Variables y Assets:
- **ChatCore:** Gestión completa de variables y assets
- **FluxCore:** Solo referencias, sin gestión directa

### 4. Eventos:
- **ChatCore:** Emite eventos de UI y usuario
- **FluxCore:** No emite eventos, solo prepara para IA

---

## 🔧 Dependencias

### ChatCore Tools:
- **Depende de:** Template DB, Assets, Variables
- **Usado por:** UI components, user interactions
- **Integración con:** WebSocket, message broadcasting

### FluxCore Tools:
- **Depende de:** Template DB, Authorization settings
- **Usado por:** Runtimes, ToolRegistry
- **Integración con:** PolicyContext, CognitionGateway

---

## 🚨 Dudas Técnicas Críticas

### 🔍 DUDA 1: Extensibilidad del Sistema de Tools
**Pregunta:** ¿Existe la forma de crecer en herramientas más allá de template.service.ts?
**Estado actual:** Solo templates están implementados en ChatCore
**Impacto:** Sistema podría estar limitado a solo templates
**Investigación requerida:** Revisar arquitectura de tools en ChatCore

### 🔍 DUDA 2: Tools como Mundo Aparte
**Pregunta:** ¿Podría tools ser tratado como un mundo agnóstico a ChatCore y FluxCore?
**Propuesta:** Sistema de tools independiente que se comunica via Kernel
**Impacto:** Mayor flexibilidad y reutilización
**Investigación requerida:** Analizar viabilidad de abstracción

### 🔍 DUDA 3: Comunicación via Kernel
**Pregunta:** ¿Cómo funcionaría la comunicación de tools con el Kernel?
**Propuesta:** Tools como Reality Adapters independientes
**Impacto:** Arquitectura más limpia y escalable
**Investigación requerida:** Diseñar mecanismo de certificación para tools

---

## ❓ Preguntas Abiertas para Arquitecto

### Para el Usuario:
1. **¿Quieres unificar ambos sistemas de tools?**
2. **Cómo quieres extender más allá de templates?**
3. **Qué herramientas adicionales necesitas?**
4. **Cómo debería ser la arquitectura ideal?**

### Para Arquitecto:
1. **¿Es viable un sistema de tools agnóstico?**
2. **Cómo se integraría con el Kernel?**
3. **Qué patrones seguir para extensibilidad?**
4. **Cómo mantener compatibilidad con código existente?**

---

## 🔗 Referencias Cruzadas

- **ChatCore Tools:** `apps/api/src/services/template.service.ts`
- **FluxCore Tools:** `apps/api/src/services/fluxcore/template-registry.service.ts`
- **Tools Registry:** `extensions/fluxcore-asistentes/src/tools/registry.ts`
- **Schema:** `packages/db/src/schema/fluxcore-tools.ts`
- **UI:** `apps/web/src/components/templates/`

---

## 🚀 Próximos Pasos

### Inmediato:
1. **Documentar cada sistema completamente**
2. **Crear mapa de dependencias**
3. **Identificar conflictos**

### Mediano Plazo:
1. **Decidir estrategia de unificación**
2. **Planificar migración**
3. **Actualizar runtimes**
