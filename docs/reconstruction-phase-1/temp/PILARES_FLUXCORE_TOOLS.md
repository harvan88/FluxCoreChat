---
id: "fluxcore-tools"
type: "schema"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/fluxcore-tools.ts"
---

# FluxCore Tools - Schema de Herramientas

**Ubicación:** `packages/db/src/schema/fluxcore-tools.ts`  
**Propósito:** Definición de datos para herramientas de FluxCore  
**Tipo:** Database Schema  

---

## 🎯 Propósito Principal

Define la estructura de datos para el sistema de herramientas de FluxCore, permitiendo que los asistentes accedan a capacidades externas de forma controlada y extensible.

---

## 🏗️ Arquitectura de Datos

### Tablas Principales:

#### 1. `fluxcore_tool_definitions`
Catálogo global de herramientas disponibles:
- `slug` - Identificador canónico
- `name` - Nombre descriptivo
- `category` - Categoría (storage, communication, agenda)
- `type` - Tipo (internal, mcp, http)
- `schema` - JSON Schema de parámetros
- `authType` - Tipo de autenticación requerida

#### 2. `fluxcore_tool_connections`
Conexiones específicas de cuentas:
- `accountId` - Usuario que conecta la herramienta
- `toolDefinitionId` - Herramienta conectada
- `status` - Estado de la conexión
- `authConfig` - Configuración de autenticación

#### 3. `fluxcore_assistant_tools`
Vínculos entre asistentes y herramientas:
- `assistantId` - Asistente que usa la herramienta
- `toolConnectionId` - Conexión específica
- `isEnabled` - Si está habilitada para el asistente

---

## 🔗 Integración con el Sistema

### 1. Con Runtime Services:
- **Tool Registry:** Registro dinámico de herramientas
- **Execution Engine:** Ejecución de herramientas
- **Auth Manager:** Gestión de credenciales

### 2. Con Asistentes:
- **Local Runtime:** Acceso directo a herramientas internas
- **OpenAI Runtime:** Declaración de functions a OpenAI
- **Custom Runtimes:** Integración específica

---

## 🔄 Flujo de Autorización

```
Catálogo (tool_definitions)
    ↓
Cuenta se conecta (tool_connections)
    ↓
Asistente vincula (assistant_tools)
    ↓
Runtime recibe configuración
    ↓
Ejecución controlada
```

---

## 📋 Estado Actual

- **✅ Schema implementado y funcional**
- **✅ Soporte para múltiples tipos de herramientas**
- **✅ Sistema de autenticación flexible**
- **✅ Integración con runtime services**

---

## 🚨 Notas Importantes

- **Extensible:** Diseñado para agregar nuevos tipos de herramientas
- **Secure:** Aislamiento de credenciales por cuenta
- **Flexible:** Soporta MCP, HTTP y herramientas internas
- **Runtime-Aware:** Optimizado para diferentes runtime types
