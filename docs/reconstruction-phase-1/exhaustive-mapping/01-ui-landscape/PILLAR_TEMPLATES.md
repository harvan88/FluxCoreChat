---
id: "pillar-templates"
type: "pillar"
status: "stable"
criticality: "high"
location: "apps/api/src/services/template.service.ts"
---

# Pilar Templates - Sistema de Plantillas

**Ubicación:** `apps/api/src/services/template.service.ts`  
**Propósito:** Proveer sistema de plantillas reutilizables para usuarios e IA  
**Tipo:** System Pillar  

---

## 🎯 Propósito Principal

El Pilar Templates permite que los usuarios creen mensajes predefinidos con variables dinámicas que pueden ser reutilizadas tanto por humanos como por asistentes IA.

---

## 🏗️ Arquitectura Dual

### 1. ChatCore Templates (Uso Humano):
- **TemplateManager:** Gestión principal
- **TemplateEditor:** Editor visual
- **TemplateQuickPicker:** Selector rápido en chat
- **TemplateAssetPicker:** Gestión de archivos

### 2. FluxCore Templates (Uso IA):
- **Template Service:** Ejecución por IA
- **Variable Engine:** Reemplazo dinámico
- **Asset Integration:** Manejo de archivos adjuntos
- **FluxCore Integration:** Configuración por asistente

---

## 🔗 Integración Completa

### Schema DB:
- `templates.ts` - Plantillas de ChatCore
- `template-assets.ts` - Archivos adjuntos
- `fluxcore-template-settings.ts` - Configuración IA

### Flujo de Uso:
```
Usuario crea plantilla → IA puede usarla → Variables reemplazadas → Mensaje enviado
```

---

## 🔄 Flujo de Ejecución

```
1. Asistente recibe instrucción de usar template
2. FluxCore ejecuta templateService.executeTemplate()
3. Variables son reemplazadas con contexto
4. Assets adjuntos son incluidos
5. Resultado es certificado y enviado
```

---

## 📋 Estado Actual

- **✅ Servicio implementado y funcional**
- **✅ UI completa para usuarios**
- **✅ Integración con FluxCore**
- **✅ Soporte para variables y assets**

---

## 🚨 Notas Importantes

- **Dual Purpose:** Diseñado para humanos e IA
- **Variable System:** Motor potente de reemplazo
- **Asset Support:** Manejo completo de archivos
- **FluxCore Ready:** Extendido para uso cognitivo
