---
id: "runtimes-subsystem"
type: "subsystem"
status: "needs_review"
criticality: "high"
location: "extensions/fluxcore-asistentes/src/index.ts y extensions/fluxcore-asistentes-openai/src/index.ts"
---

# Runtimes Subsystem - FluxCore

**Fecha:** 2026-03-20  
**Propósito:** Dos runtimes soberanos para ejecución de asistentes IA  
**Verificación:** ✅ Basado en código real  
**Arquitectura:** Local (1541 líneas) vs OpenAI (152 líneas)

---

## 🎯 Propósito

FluxCore tiene **dos runtimes completamente diferentes** que ofrecen servicios distintos con calidades diferentes:

### FluxCore Local Runtime:
- **Propósito:** Ejecución local y soberana
- **Arquitectura:** Completa, 1541 líneas
- **Ventajas:** Control total, no dependencia externa
- **Desventajas:** Menor desarrollo, respuestas menos acertadas

### OpenAI Assistants Runtime:
- **Propósito:** Ejecución delegada a OpenAI
- **Arquitectura:** Simple, 152 líneas
- **Ventajas:** Mayor desarrollo, respuestas más acertadas
- **Desventajas:** Dependencia externa, depreciado próximamente

---

## 🏗️ Arquitectura

### FluxCore Extension (Runtime Local):
```typescript
// extensions/fluxcore-asistentes/src/index.ts
export class FluxCoreExtension {
    public readonly id = '@fluxcore/asistentes';
    
    async onMessage(params: any): Promise<any> {
        // Lógica completa de runtime local
        // Prompt building, tool registry, cognition
    }
}
```

### OpenAI Assistants Runtime:
```typescript
// extensions/fluxcore-asistentes-openai/src/index.ts
export class OpenAIAssistantsRuntime {
    public readonly id = '@fluxcore/asistentes-openai';
    
    async generateResponse(params: any): Promise<any> {
        // Delegación simple a OpenAI API
    }
}
```

---

## 📊 Diferencias Fundamentales

### 1. Complejidad:
- **Local:** 1541 líneas, lógica completa
- **OpenAI:** 152 líneas, delegación simple

### 2. Herramientas:
- **Local:** Tools propias, ejecución local
- **OpenAI:** Tools delegadas, ejecución remota

### 3. Configuración:
- **Local:** Configuración completa y detallada
- **OpenAI:** Configuración mínima, delegada

### 4. RAG:
- **Local:** RAG local, con posibilidad de consultas externas
- **OpenAI:** RAG externo, gestionado por OpenAI

---

## 🔧 Dependencias

### Runtime Local:
- **Depende de:** ToolRegistry, PromptBuilder, CognitionGateway
- **Usado por:** Asistentes locales
- **Integración con:** Kernel, Templates, RAG local

### Runtime OpenAI:
- **Depende de:** OpenAI API, configuración mínima
- **Usado por:** Asistentes remotos
- **Integración con:** Kernel (solo para certificación)

---

## 🎯 Respuestas del Usuario (VERIFICADAS)

### ¿Cuál runtime quieres mantener?
**Respuesta:** Ambos son soberanos y deben continuar

### ¿Cómo se selecciona el runtime activo?
**Respuesta:** Cuando se activa el asistente desde la lista de asistentes

### ¿Qué runtime está en producción?
**Respuesta:** Ambos funcionan. Estábamos trabajando en RAG cruzado (local consultando OpenAI externo) pero nos detuvimos. El problema era más de arquitectura de nuestro RAG.

### ¿Quieres unificar ambos runtimes?
**Respuesta:** No. Ofrecen servicios diferentes, en calidades distintas. OpenAI tiene mayor desarrollo pero está depreciado.

### Diferenciación en UI:
**Respuesta:** Logos y modales diferencian si es OpenAI o local. El usuario sabe qué está creando/activando.

---

## 🚨 Dudas Técnicas Críticas

### 🔍 DUDA 1: activeRuntimeId Implementación
**Pregunta:** ¿Existe `activeRuntimeId` en el código o es un mecanismo no implementado?
**Estado:** Necesita investigación en documentación de asistentes
**Impacto:** Podría ser un concepto no implementado
**Investigación requerida:** Revisar documentación de asistentes para conectar ideas

### 🔍 DUDA 2: RAG Cruzado
**Pregunta:** ¿Qué estado tiene el RAG cruzado (local → OpenAI externo)?
**Estado:** Trabajo detenido, problema identificado como arquitectónico
**Impacto:** Funcionalidad importante no completada
**Investigación requerida:** Evaluar si se retoma el trabajo

### 🔍 DUDA 3: Depreciación OpenAI
**Pregunta:** ¿Cuál es el timeline de deprecación del asistente OpenAI?
**Estado:** "Funcionará hasta que esté" pero sin fecha clara
**Impacto:** Planificación de migración urgente
**Investigación requerida:** Confirmar timeline exacto

---

## 🔗 Referencias Cruzadas

- **Runtime Local:** `extensions/fluxcore-asistentes/src/index.ts` (1541 líneas)
- **Runtime OpenAI:** `extensions/fluxcore-asistentes-openai/src/index.ts` (152 líneas)
- **Tool Registry:** `extensions/fluxcore-asistentes/src/tools/registry.ts`
- **Cognition Gateway:** `apps/api/src/services/fluxcore/cognition-gateway.service.ts`

---

## 🚀 Próximos Pasos

### Inmediato:
1. **Investigar activeRuntimeId** en el código
2. **Evaluar estado del RAG cruzado**
3. **Confirmar timeline de OpenAI**

### Mediano Plazo:
1. **Mejorar runtime local** para reducir brecha con OpenAI
2. **Planificar migración** cuando OpenAI se deprecie
3. **Documentar mejor** el mecanismo de selección
