---
id: "pillar-tools"
type: "pillar"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/fluxcore-tools.ts"
---

# Pilar Tools - Sistema de Herramientas

**Ubicación:** `packages/db/src/schema/fluxcore-tools.ts`  
**Propósito:** Proveer acceso controlado a capacidades externas para asistentes  
**Tipo:** System Pillar  

---

## 🎯 Propósito Principal

El Pilar Tools permite que los asistentes accedan a capacidades externas (bases de conocimiento, APIs, servicios) de forma controlada, segura y extensible.

---

## 🏗️ Arquitectura de Tres Niveles

### 1. Catálogo Global (tool_definitions):
- **Definición de herramientas:** Nombre, descripción, schema
- **Tipos:** internal, MCP, HTTP
- **Categorías:** storage, communication, agenda, etc.
- **Autenticación:** none, oauth2, api_key

### 2. Conexiones por Cuenta (tool_connections):
- **Habilitación por usuario:** Cada cuenta conecta herramientas
- **Credenciales seguras:** Aislamiento por cuenta
- **Estado de conexión:** connected, disconnected, error

### 3. Vínculos por Asistente (assistant_tools):
- **Habilitación por asistente:** Qué herramientas puede usar cada asistente
- **Configuración específica:** Parámetros por asistente
- **Control granular:** Encendido/apagado por herramienta

---

## 🔗 Integración con Runtimes

### 1. AsistentesLocal:
```typescript
// Declara herramientas disponibles
const tools = ['search_knowledge', 'send_template'];
// FluxCore ejecuta cuando el asistente las solicita
```

### 2. AsistentesOpenAI:
```typescript
// FluxCore declara functions a OpenAI
const functions = await fluxcore.getFunctionsForAssistant(assistantId);
// OpenAI decide cuándo usarlas
// FluxCore ejecuta en su soberanía
```

### 3. Tool Registry (Extension):
```typescript
// Registro dinámico de herramientas
class ToolRegistry {
  async getTool(slug: string): Promise<Tool | null>
  async executeTool(slug: string, params: any): Promise<any>
}
```

---

## 🔄 Flujo de Ejecución

```
1. Runtime recibe configuración de herramientas
2. Asistente solicita uso de herramienta
3. FluxCore valida permisos y ejecuta
4. Resultado es certificado y retornado
5. Asistente continúa con el resultado
```

---

## 📋 Estado Actual

- **✅ Schema completo implementado**
- **✅ Tool Registry funcional**
- **✅ Integración con todos los runtimes**
- **✅ Sistema de autenticación activo**

---

## 🚨 Notas Importantes

- **Extensible:** Fácil agregar nuevos tipos de herramientas
- **Secure:** Aislamiento de credenciales y ejecución controlada
- **Runtime Agnostic:** Funciona con cualquier runtime
- **Production Ready:** En uso activo por múltiples asistentes
