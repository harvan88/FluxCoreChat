---
id: "fluxcore-asistentes"
type: "runtime"
status: "stable"
criticality: "high"
location: "extensions/fluxcore-asistentes"
---

# FluxCore Asistentes - Runtime Local

**Ubicación:** `extensions/fluxcore-asistentes/`  
**Propósito:** Runtime local para ejecución de asistentes FluxCore  
**Tipo:** Extension Runtime  

---

## 🎯 Propósito Principal

Implementa el runtime local de FluxCore para ejecutar asistentes con capacidades cognitivas completas, incluyendo procesamiento de lenguaje, tool calling y gestión de contexto.

---

## 🏗️ Arquitectura del Runtime

### Componentes Principales:
- `id`: @fluxcore/asistentes
- `name`: Asistentes
- `version`: 1.0.0
- `description`: Asistente IA integrado de FluxCore para respuestas inteligentes basadas en contexto
- `author`: FluxCore
- `preinstalled`: true
- `permissions`: read:context.public,read:context.private,read:context.relationship,read:context.history,write:context.overlay,send:messages,modify:automation
- `hooks`: onMessage,onInstall,onUninstall,onConfigChange
- `ui`: [object Object]
- `configSchema`: [object Object]
- `entrypoint`: ./src/index.ts

---

## 🔗 Integración con FluxCore

### 1. Entrada/Salida:
- **Input:** `RuntimeInput` con contexto y configuración
- **Output:** `ExecutionAction[]` con acciones a ejecutar
- **Signals:** Integración con sistema de señales

### 2. Servicios Utilizados:
- **LLM Service:** Para procesamiento cognitivo
- **Tool Registry:** Para acceso a herramientas
- **RAG Service:** Para búsqueda de conocimiento
- **Template Service:** Para plantillas

---

## 🔄 Flujo de Ejecución

```
1. Recibir RuntimeInput
2. Validar política (policy gate)
3. Construir prompt (contexto + instrucciones)
4. Ejecutar LLM
5. Procesar tool calls
6. Certificar resultados
7. Retornar ExecutionAction[]
```

---

## 📋 Estado Actual

- **✅ Runtime implementado y funcional**
- **✅ Integración completa con FluxCore**
- **✅ Soporte para tools y templates**
- **✅ Sistema de políticas activo**

---

## 🚨 Notas Importantes

- **Local First:** Diseñado para ejecución local
- **Tool Enabled:** Acceso completo a herramientas del sistema
- **Policy Driven:** Todas las acciones pasan por validación
- **Extensible:** Arquitectura modular para nuevas capacidades
