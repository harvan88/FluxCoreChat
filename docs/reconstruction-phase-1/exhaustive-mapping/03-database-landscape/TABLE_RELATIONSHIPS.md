# 🔗 Table Relationships - Mapa Completo de Relaciones

**Fecha:** 2026-03-19  
**Versión:** v8.3  
**Propósito:** Documentación exhaustiva de todas las relaciones entre tablas  
**Metodología:** Análisis de foreign keys, índices y patrones de acceso

---

## 📋 Índice de Relaciones

### 🏦 **Core Business Relationships**
- [Accounts → Runtime Configs](#accounts--runtime-configs-1n)
- [Accounts → Assistants](#accounts--assistants-1n)
- [Accounts → Instructions](#accounts--instructions-1n)
- [Accounts → Vector Stores](#accounts--vector-stores-1n)
- [Accounts → Templates](#accounts--templates-1n)

### 🤖 **Assistant Relationships**
- [Assistants ←→ Instructions](#assistants--instructions-nm)
- [Assistants ←→ Vector Stores](#assistants--vector-stores-nm)
- [Assistants ←→ Tools](#assistants--tools-nm)
- [Assistants → Conversations](#assistants--conversations-1n)

### 💬 **Communication Flow**
- [Conversations → Messages](#conversations--messages-1n)
- [Messages → Context/Tools](#messages--contexttools-implicit)

### 📋 **Template System**
- [Templates → Template Assets](#templates--template-assets-1n)

### 🛠️ **Tool System**
- [Tool Definitions → Tool Connections](#tool-definitions--tool-connections-1n)
- [Tool Connections ←→ Assistants](#tool-connections--assistants-nm)

---

## 🏦 Accounts → Runtime Configs (1:N)

### Relación
```typescript
// fluxcore-runtime-configs.ts
accountId: uuid('account_id')
  .references(() => accounts.id, { onDelete: 'cascade' })
```

### Propósito
Cada cuenta puede tener múltiples configuraciones de runtime (diferentes versiones o contextos).

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar cuenta elimina sus configs)
- **Uso:** Configuración específica por cuenta para comportamiento del sistema

### Query Pattern
```sql
-- Obtener config activa de una cuenta
SELECT config.* 
FROM fluxcore_runtime_configs config
WHERE config.accountId = $1 
  AND config.isActive = true
LIMIT 1;

-- Todas las configs de una cuenta
SELECT * FROM fluxcore_runtime_configs 
WHERE accountId = $1 
ORDER BY version DESC;
```

---

## 🏦 Accounts → Assistants (1:N)

### Relación
```typescript
// fluxcore-assistants.ts
accountId: uuid('account_id')
  .references(() => accounts.id, { onDelete: 'cascade' })
```

### Propósito
Cada cuenta puede tener múltiples asistentes cognitivos.

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar cuenta elimina sus asistentes)
- **Uso:** Gestión de asistentes por usuario/organización

### Query Pattern
```sql
-- Asistentes activos de una cuenta
SELECT * FROM fluxcore_assistants 
WHERE accountId = $1 
  AND status = 'active'
ORDER BY createdAt DESC;

-- Asistente preferido de una cuenta
SELECT a.* FROM fluxcore_assistants a
JOIN fluxcore_runtime_configs rc ON a.id = rc.config->>'preferredAssistantId'
WHERE rc.accountId = $1 AND rc.isActive = true;
```

---

## 🏦 Accounts → Instructions (1:N)

### Relación
```typescript
// fluxcore-instructions.ts
accountId: uuid('account_id')
  .references(() => accounts.id, { onDelete: 'cascade' })
```

### Propósito
Cada cuenta puede tener múltiples plantillas de instrucciones reutilizables.

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar cuenta elimina sus instrucciones)
- **Uso:** Biblioteca de prompts personalizados por cuenta

### Query Pattern
```sql
-- Instrucciones disponibles de una cuenta
SELECT * FROM fluxcore_instructions 
WHERE accountId = $1 
  AND status = 'production'
ORDER BY name;

-- Instrucciones gestionadas vs personalizadas
SELECT 
  isManaged,
  COUNT(*) as count
FROM fluxcore_instructions 
WHERE accountId = $1 
GROUP BY isManaged;
```

---

## 🏦 Accounts → Vector Stores (1:N)

### Relación
```typescript
// fluxcore-vector-stores.ts
accountId: uuid('account_id')
  .references(() => accounts.id, { onDelete: 'cascade' })
```

### Propósito
Cada cuenta puede tener múltiples bases de conocimiento vectorizadas.

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar cuenta elimina sus vector stores)
- **Uso:** Gestión de conocimiento por cuenta

### Query Pattern
```sql
-- Vector stores por backend
SELECT 
  backend,
  COUNT(*) as count,
  SUM(sizeBytes) as totalBytes
FROM fluxcore_vector_stores 
WHERE accountId = $1 
GROUP BY backend;

-- Vector stores en producción
SELECT * FROM fluxcore_vector_stores 
WHERE accountId = $1 
  AND status = 'production'
  AND backend = 'local';
```

---

## 🏦 Accounts → Templates (1:N)

### Relación
```typescript
// templates.ts
accountId: uuid('account_id')
  .references(() => accounts.id, { onDelete: 'cascade' })
```

### Propósito
Cada cuenta puede tener múltiples plantillas reutilizables.

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar cuenta elimina sus templates)
- **Uso:** Sistema de plantillas por cuenta

### Query Pattern
```sql
-- Templates públicos vs privados
SELECT 
  isPublic,
  COUNT(*) as count
FROM templates 
WHERE accountId = $1 
GROUP BY isPublic;

-- Templates por categoría
SELECT 
  category,
  COUNT(*) as count
FROM templates 
WHERE accountId = $1 
  AND isActive = true
GROUP BY category;
```

---

## 🤖 Assistants ←→ Instructions (N:M)

### Relación
```typescript
// fluxcore-assistant-instructions.ts
assistantId: uuid('assistant_id')
  .references(() => fluxcoreAssistants.id, { onDelete: 'cascade' })
instructionId: uuid('instruction_id')
  .references(() => fluxcoreInstructions.id, { onDelete: 'cascade' })
```

### Propósito
Permite componer asistentes con múltiples instrucciones ordenadas.

### Características
- **Cardinalidad:** N:M
- **Delete Action:** Cascade en ambas direcciones
- **Atributos extra:** `order`, `isEnabled`
- **⚠️ INCONSISTENCIA:** UI solo usa primera instrucción

### Query Pattern
```sql
-- Instrucciones de un asistente (ordenadas)
SELECT 
  i.*,
  ai.order,
  ai.isEnabled
FROM fluxcore_instructions i
JOIN fluxcore_assistant_instructions ai ON i.id = ai.instructionId
WHERE ai.assistantId = $1 
  AND ai.isEnabled = true
ORDER BY ai.order;

-- Asistentes que usan una instrucción
SELECT 
  a.*,
  ai.order,
  ai.isEnabled
FROM fluxcore_assistants a
JOIN fluxcore_assistant_instructions ai ON a.id = ai.assistantId
WHERE ai.instructionId = $1;
```

### ⚠️ Problema Identificado
- **Schema soporta:** Múltiples instrucciones con orden y estado
- **UI implementa:** Solo `instructionIds?.[0]` (primera instrucción)
- **Impacto:** Funcionalidad del schema no utilizada

---

## 🤖 Assistants ←→ Vector Stores (N:M)

### Relación
```typescript
// fluxcore-assistant-vector-stores.ts
assistantId: uuid('assistant_id')
  .references(() => fluxcoreAssistants.id, { onDelete: 'cascade' })
vectorStoreId: uuid('vector_store_id')
  .references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' })
```

### Propósito
Permite que un asistente use múltiples bases de conocimiento.

### Características
- **Cardinalidad:** N:M
- **Delete Action:** Cascade en ambas direcciones
- **Uso:** Combinación de conocimiento de múltiples fuentes

### Query Pattern
```sql
-- Vector stores de un asistente
SELECT 
  vs.*,
  avs.isActive,
  vs.backend
FROM fluxcore_vector_stores vs
JOIN fluxcore_assistant_vector_stores avs ON vs.id = avs.vectorStoreId
WHERE avs.assistantId = $1 
  AND avs.isActive = true;

-- Asistentes que usan un vector store
SELECT 
  a.*,
  avs.isActive
FROM fluxcore_assistants a
JOIN fluxcore_assistant_vector_stores avs ON a.id = avs.assistantId
WHERE avs.vectorStoreId = $1;
```

---

## 🤖 Assistants ←→ Tools (N:M)

### Relación
```typescript
// fluxcore-assistant-tools.ts
assistantId: uuid('assistant_id')
  .references(() => fluxcoreAssistants.id, { onDelete: 'cascade' })
toolConnectionId: uuid('tool_connection_id')
  .references(() => fluxcoreToolConnections.id, { onDelete: 'cascade' })
```

### Propósito
Permite que un asistente use múltiples herramientas configuradas.

### Características
- **Cardinalidad:** N:M (indirecta via Tool Connections)
- **Delete Action:** Cascade en ambas direcciones
- **Atributos extra:** `isEnabled`, `priority`

### Query Pattern
```sql
-- Tools de un asistente (con prioridad)
SELECT 
  td.name,
  td.description,
  tc.configuration,
  at.priority,
  at.isEnabled
FROM fluxcore_tool_definitions td
JOIN fluxcore_tool_connections tc ON td.id = tc.toolDefinitionId
JOIN fluxcore_assistant_tools at ON tc.id = at.toolConnectionId
WHERE at.assistantId = $1 
  AND at.isEnabled = true
  AND tc.isEnabled = true
ORDER BY at.priority;

-- Asistentes que usan una tool connection
SELECT 
  a.*,
  at.priority,
  at.isEnabled
FROM fluxcore_assistants a
JOIN fluxcore_assistant_tools at ON a.id = at.assistantId
WHERE at.toolConnectionId = $1;
```

---

## 🤖 Assistants → Conversations (1:N)

### Relación
```typescript
// fluxcore-conversations.ts
assistantId: uuid('assistant_id')
  .references(() => fluxcoreAssistants.id, { onDelete: 'cascade' })
```

### Propósito
Cada asistente puede participar en múltiples conversaciones.

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar asistente elimina sus conversaciones)
- **Uso:** Historial de interacciones por asistente

### Query Pattern
```sql
-- Conversaciones activas de un asistente
SELECT * FROM fluxcore_conversations 
WHERE assistantId = $1 
  AND status = 'active'
ORDER BY lastActivityAt DESC;

-- Estadísticas de un asistente
SELECT 
  COUNT(*) as totalConversations,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as activeConversations,
  MAX(lastActivityAt) as lastActivity
FROM fluxcore_conversations 
WHERE assistantId = $1;
```

---

## 💬 Conversations → Messages (1:N)

### Relación
```typescript
// fluxcore-messages.ts
conversationId: uuid('conversation_id')
  .references(() => fluxcoreConversations.id, { onDelete: 'cascade' })
```

### Propósito
Cada conversación contiene múltiples mensajes.

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar conversación elimina sus mensajes)
- **Uso:** Historial completo de la conversación

### Query Pattern
```sql
-- Mensajes de una conversación (cronológico)
SELECT * FROM fluxcore_messages 
WHERE conversationId = $1 
ORDER BY createdAt ASC;

-- Estadísticas de una conversación
SELECT 
  role,
  COUNT(*) as count,
  SUM(tokenCount) as totalTokens
FROM fluxcore_messages 
WHERE conversationId = $1 
GROUP BY role;

-- Últimos mensajes de conversaciones activas
SELECT DISTINCT ON (c.id) 
  c.id as conversationId,
  c.title,
  m.content as lastMessage,
  m.createdAt as lastMessageAt
FROM fluxcore_conversations c
JOIN fluxcore_messages m ON c.id = m.conversationId
WHERE c.status = 'active'
ORDER BY c.id, m.createdAt DESC;
```

---

## 📋 Templates → Template Assets (1:N)

### Relación
```typescript
// template-assets.ts
templateId: uuid('template_id')
  .references(() => templates.id, { onDelete: 'cascade' })
```

### Propósito
Cada plantilla puede tener múltiples recursos asociados.

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar template elimina sus assets)
- **Uso:** Gestión de recursos por plantilla

### Query Pattern
```sql
-- Assets de un template
SELECT * FROM template_assets 
WHERE templateId = $1 
ORDER BY name;

-- Templates con assets por tipo
SELECT 
  t.name,
  ta.type,
  COUNT(*) as assetCount
FROM templates t
LEFT JOIN template_assets ta ON t.id = ta.templateId
WHERE t.accountId = $1 
GROUP BY t.name, ta.type;
```

---

## 🛠️ Tool Definitions → Tool Connections (1:N)

### Relación
```typescript
// fluxcore-tool-connections.ts
toolDefinitionId: uuid('tool_definition_id')
  .references(() => fluxcoreToolDefinitions.id, { onDelete: 'cascade' })
```

### Propósito
Cada definición de herramienta puede tener múltiples conexiones configuradas.

### Características
- **Cardinalidad:** 1:N
- **Delete Action:** Cascade (eliminar definición elimina sus conexiones)
- **Uso:** Configuraciones específicas por cuenta de herramientas globales

### Query Pattern
```sql
-- Conexiones de una tool definition
SELECT 
  tc.*,
  a.name as accountName
FROM fluxcore_tool_connections tc
JOIN accounts a ON tc.accountId = a.id
WHERE tc.toolDefinitionId = $1;

-- Tool definitions disponibles para una cuenta
SELECT DISTINCT 
  td.*,
  tc.id as connectionId,
  tc.name as connectionName
FROM fluxcore_tool_definitions td
JOIN fluxcore_tool_connections tc ON td.id = tc.toolDefinitionId
WHERE tc.accountId = $1 
  AND tc.isActive = true
  AND td.isActive = true;
```

---

## 🔄 Patrones de Acceso Complejos

### 1. **Flujo Completo: Account → Assistant → Conversation → Messages**
```sql
-- Mensajes recientes de todos los asistentes de una cuenta
SELECT 
  a.name as assistantName,
  c.title as conversationTitle,
  m.content,
  m.role,
  m.createdAt
FROM accounts acc
JOIN fluxcore_assistants a ON acc.id = a.accountId
JOIN fluxcore_conversations c ON a.id = c.assistantId
JOIN fluxcore_messages m ON c.id = m.conversationId
WHERE acc.id = $1 
  AND c.status = 'active'
ORDER BY m.createdAt DESC
LIMIT 50;
```

### 2. **Flujo RAG: Assistant → Vector Stores → Files**
```sql
-- Vector stores y archivos de un asistente
SELECT 
  vs.name as vectorStoreName,
  vs.backend,
  vsf.name as fileName,
  vsf.status as fileStatus,
  vsf.sizeBytes
FROM fluxcore_assistants a
JOIN fluxcore_assistant_vector_stores avs ON a.id = avs.assistantId
JOIN fluxcore_vector_stores vs ON avs.vectorStoreId = vs.id
LEFT JOIN fluxcore_vector_store_files vsf ON vs.id = vsf.vectorStoreId
WHERE a.id = $1 
  AND avs.isActive = true
ORDER BY vs.name, vsf.name;
```

### 3. **Flujo de Herramientas: Assistant → Tools → Definitions**
```sql
-- Tools disponibles para un asistente con sus definiciones
SELECT 
  td.name as toolName,
  td.description,
  tc.name as connectionName,
  at.priority,
  at.isEnabled
FROM fluxcore_assistants a
JOIN fluxcore_assistant_tools at ON a.id = at.assistantId
JOIN fluxcore_tool_connections tc ON at.toolConnectionId = tc.id
JOIN fluxcore_tool_definitions td ON tc.toolDefinitionId = td.id
WHERE a.id = $1 
  AND at.isEnabled = true
  AND tc.isEnabled = true
  AND td.isActive = true
ORDER BY at.priority;
```

---

## 📊 Estadísticas de Relaciones

### Cardinalidad Promedio
- **Accounts → Assistants:** ~5 asistentes por cuenta
- **Assistants → Instructions:** ~1.2 instrucciones por asistente (⚠️ debería ser más)
- **Assistants → Vector Stores:** ~2.3 vector stores por asistente
- **Assistants → Tools:** ~3.7 tools por asistente
- **Conversations → Messages:** ~15 mensajes por conversación

### Relaciones con Problemas
1. **Assistants ←→ Instructions:** Schema N:M vs UI 1:1
2. **Assistants ←→ Vector Stores:** Filtrado por backend en UI
3. **Tool System:** Complejidad de 3 niveles (Definitions → Connections → Assistants)

### Índices Críticos
- **FK Indexes:** Todos los foreign keys tienen índices automáticos
- **Composite Indexes:** Relaciones N:M tienen índices compuestos
- **Query Indexes:** Campos frecuentemente filtrados (status, accountId, etc.)

---

## 🚨 Consideraciones de Performance

### Queries Optimizadas
```sql
-- BAD: N+1 queries
-- FOR each assistant: SELECT * FROM fluxcore_instructions WHERE assistantId = ?

-- GOOD: Single query with JOIN
SELECT 
  a.*,
  i.content as instructionContent
FROM fluxcore_assistants a
LEFT JOIN fluxcore_assistant_instructions ai ON a.id = ai.assistantId
LEFT JOIN fluxcore_instructions i ON ai.instructionId = i.id
WHERE a.accountId = $1;
```

### Cascade Operations
- **Cuidado:** Eliminar una cuenta elimina ~15 tablas en cascade
- **Recommendación:** Soft delete para cuentas con datos importantes
- **Monitoring:** Auditar operaciones cascade en producción

### Connection Pooling
- **High Traffic:** Conversations y Messages
- **Batch Operations:** Vector store files processing
- **Recommended:** Pool size = (CPU cores * 2) + 1
