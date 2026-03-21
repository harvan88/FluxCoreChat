---
id: "template-service"
type: "service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/template.service.ts"
---

# Template Service - Gestión de Plantillas

**Ubicación:** `apps/api/src/services/template.service.ts`  
**Propósito:** Servicio centralizado para gestión de plantillas de ChatCore  
**Tipo:** Core Service  

---

## 🎯 Propósito Principal

`TemplateService` proporciona la lógica de negocio para crear, leer, actualizar y eliminar plantillas de mensajería predefinidas que los usuarios pueden reutilizar en sus conversaciones.

---

## 🏗️ Arquitectura

### Métodos Principales:
- `createTemplate()` - Crear nueva plantilla
- `getTemplates()` - Obtener plantillas de usuario
- `updateTemplate()` - Actualizar plantilla existente
- `deleteTemplate()` - Eliminar plantilla
- `executeTemplate()` - Ejecutar plantilla con variables

---

## 🔗 Dependencias del Sistema

### 1. Dependencias que consume:
- **Database:** `templates.ts` schema
- **Asset Service:** Para gestión de archivos adjuntos
- **Validation Service:** Para validación de contenido

### 2. Quién depende de él:
- **TemplateManager UI:** Componente principal de gestión
- **TemplateEditor:** Editor de plantillas
- **TemplateQuickPicker:** Selector rápido en chat
- **FluxCore Runtime:** Para ejecución por IA

---

## 🔄 Flujos Principales

### 1. Creación de Plantilla
```typescript
const template = await templateService.createTemplate({
  accountId: 'acc-456',
  name: 'Saludo estándar',
  content: 'Hola {nombre}, ¿cómo estás?',
  variables: ['nombre']
});
```

### 2. Ejecución con Variables
```typescript
const result = await templateService.executeTemplate(templateId, {
  nombre: 'Juan'
});
// Resultado: "Hola Juan, ¿cómo estás?"
```

---

## 📋 Estado Actual

- **✅ Implementado y funcional**
- **✅ Soporte para variables dinámicas**
- **✅ Gestión de assets adjuntos**
- **✅ Integración con FluxCore**

---

## 🚨 Notas Importantes

- **ChatCore Native:** Diseñado originalmente para uso humano
- **FluxCore Integration:** Extendido para uso por IA
- **Variable System:** Motor de reemplazo de variables potente
- **Asset Support:** Manejo completo de archivos adjuntos
