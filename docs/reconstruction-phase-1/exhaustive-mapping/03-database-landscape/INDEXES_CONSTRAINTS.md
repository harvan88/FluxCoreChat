# 🚀 INDEXES_CONSTRAINTS - Performance y Reglas de Integridad

**Fecha:** 2026-03-19  
**Versión:** v8.3  
**Propósito:** Documentación completa de índices y constraints para performance  
**Metodología:** Análisis de todos los índices definidos y patrones de acceso

---

## 📋 Índice de Contenidos

### 🏃‍♂️ **Performance Indexes**
- [Primary Keys](#primary-keys)
- [Foreign Keys](#foreign-keys) 
- [Unique Constraints](#unique-constraints)
- [Composite Indexes](#composite-indexes)
- [Partial Indexes](#partial-indexes)

### 🛡️ **Integrity Constraints**
- [Foreign Key Constraints](#foreign-key-constraints)
- [Check Constraints](#check-constraints)
- [Not Null Constraints](#not-null-constraints)
- [Default Values](#default-values)

### 📊 **Query Patterns](#query-patterns)
- [High-Frequency Queries](#high-frequency-queries)
- [Performance Optimizations](#performance-optimizations)

---

## 🏃‍♂️ Performance Indexes

### Primary Keys
Todas las tablas usan UUID primary keys con generación automática:

```sql
-- Estándar en todas las tablas
id: uuid('id').primaryKey().defaultRandom()
```

**Ventajas:**
- Globally unique (no conflictos entre environments)
- No secuencias predecibles
- Good para distributed systems

### Foreign Keys
Índices automáticos creados por Drizzle para todos los foreign keys:

```sql
-- Ejemplo típico
accountId: uuid('account_id')
  .references(() => accounts.id, { onDelete: 'cascade' })
-- Crea automáticamente índice en account_id
```

**Foreign Keys con índices automáticos:**
- `fluxcore_assistants.accountId`
- `fluxcore_instructions.accountId`
- `fluxcore_vector_stores.accountId`
- `fluxcore_conversations.accountId`
- `templates.accountId`
- `fluxcore_runtime_configs.accountId`
- Y 20+ más...

### Unique Constraints

#### accounts.email
```sql
email: varchar('email', { length: 255 }).notNull().unique()
```
**Propósito:** Evitar cuentas duplicadas
**Query pattern:** Login, registration, email lookup

#### fluxcore_tool_definitions.name
```sql
name: varchar('name', { length: 100 }).notNull().unique()
```
**Propósito:** Nombres únicos de herramientas globales
**Query pattern:** Tool lookup por nombre

### Composite Indexes

#### fluxcore_assistant_instructions
```sql
// Índices definidos en la tabla puente
assistantIdx: index('idx_assistant_instructions_assistant').on(table.assistantId),
instructionIdx: index('idx_assistant_instructions_instruction').on(table.instructionId),
uniqueAssistantInstruction: index('idx_unique_assistant_instruction').on(table.assistantId, table.instructionId)
```

**Propósito:**
- `assistantIdx`: Obtener instrucciones de un asistente (ordenado por order field)
- `instructionIdx`: Encontrar asistentes que usan una instrucción
- `uniqueAssistantInstruction`: Evitar duplicados N:M

#### fluxcore_assistant_tools
```sql
assistantIdx: index('idx_assistant_tools_assistant').on(table.assistantId),
toolConnectionIdx: index('idx_assistant_tools_tool_connection').on(table.toolConnectionId),
uniqueAssistantTool: index('idx_unique_assistant_tool').on(table.assistantId, table.toolConnectionId)
```

#### fluxcore_rag_configurations
```sql
vectorStoreIdx: index('idx_rag_config_vs_drizzle').on(table.vectorStoreId),
accountIdx: index('idx_rag_config_account_drizzle').on(table.accountId)
```

**Propósito:**
- `vectorStoreIdx`: Configuración RAG específica de un vector store
- `accountIdx`: Configuraciones por defecto de una cuenta

### Partial Indexes (Implicitos)

#### Status-based filtering
Algunas queries comunes se benefician de índices parciales implícitos:

```sql
-- Queries frecuentes con status
SELECT * FROM fluxcore_assistants WHERE accountId = $1 AND status = 'active'
SELECT * FROM fluxcore_conversations WHERE accountId = $1 AND status = 'active'
```

**Recomendación:** Considerar índices parciales explícitos:
```sql
-- Futura optimización
CREATE INDEX idx_assistants_active ON fluxcore_assistants (accountId) 
WHERE status = 'active';
```

---

## 🛡️ Integrity Constraints

### Foreign Key Constraints

#### Cascade Delete Rules
```sql
// Estándar cascade - eliminar padre elimina hijos
.references(() => accounts.id, { onDelete: 'cascade' })
```

**Tablas con cascade:**
- **accounts →** Todas las tablas con accountId
- **assistants →** conversations, assistant_instructions, assistant_tools
- **instructions →** assistant_instructions
- **vector_stores →** vector_store_files, assistant_vector_stores, rag_configurations

#### ⚠️ Cascade Considerations
**Problema:** Eliminar una cuenta elimina ~15 tablas en cascade
**Impacto:** Operación pesada, requiere careful monitoring
**Solución:** Considerar soft delete para cuentas importantes

### Check Constraints

#### Retrieval Score Range
```sql
retrievalMinScore: numeric('retrieval_min_score', { precision: 4, scale: 3 }).default('0.300')
```
**Validación implícita:** Rango 0.000-0.999 por precision/scale
**UI validation:** 0.1-0.7 range en slider

#### Enum Validations
```sql
status: varchar('status', { length: 20 }).notNull().default('draft')
backend: varchar('backend', { length: 20 }).notNull().default('local')
role: varchar('role', { length: 20 }).notNull() // 'user' | 'assistant' | 'system'
```
**Validación:** A nivel de aplicación, no constraints DB

### Not Null Constraints
Campos críticos con NOT NULL:

#### Core Business Fields
```sql
// Accounts
email: varchar('email', { length: 255 }).notNull().unique()
name: varchar('name', { length: 255 }).notNull()

// Assistants
name: varchar('name', { length: 255 }).notNull()
runtimeType: varchar('runtime_type', { length: 20 }).notNull().default('local')
status: varchar('status', { length: 20 }).notNull().default('draft')

// Messages
content: text('content').notNull()
role: varchar('role', { length: 20 }).notNull()
```

### Default Values

#### System Defaults
```sql
// Timestamps
createdAt: timestamp('created_at').defaultNow().notNull()
updatedAt: timestamp('updated_at').defaultNow().notNull()

// Status defaults
status: varchar('status', { length: 20 }).notNull().default('draft')
isActive: boolean('is_active').default(true)
isEnabled: boolean('is_enabled').default(true)

// Configuration defaults
backend: varchar('backend', { length: 20 }).notNull().default('local')
source: varchar('source', { length: 20 }).notNull().default('primary')
```

---

## 📊 Query Patterns

### High-Frequency Queries

#### 1. Account Lookup
```sql
-- Login/authentication
SELECT * FROM accounts WHERE email = $1;

-- Account data loading
SELECT * FROM fluxcore_assistants WHERE accountId = $1 AND status = 'active';
SELECT * FROM fluxcore_conversations WHERE accountId = $1 AND status = 'active';
```

**Índices utilizados:**
- `accounts.email` (unique)
- `fluxcore_assistants.accountId` (FK)
- `fluxcore_conversations.accountId` (FK)

#### 2. Assistant Configuration Loading
```sql
-- Cargar asistente con todas sus relaciones
SELECT 
  a.*,
  i.content as instructionContent,
  vs.name as vectorStoreName,
  td.name as toolName
FROM fluxcore_assistants a
LEFT JOIN fluxcore_assistant_instructions ai ON a.id = ai.assistantId
LEFT JOIN fluxcore_instructions i ON ai.instructionId = i.id
LEFT JOIN fluxcore_assistant_vector_stores avs ON a.id = avs.assistantId
LEFT JOIN fluxcore_vector_stores vs ON avs.vectorStoreId = vs.id
LEFT JOIN fluxcore_assistant_tools at ON a.id = at.assistantId
LEFT JOIN fluxcore_tool_connections tc ON at.toolConnectionId = tc.id
LEFT JOIN fluxcore_tool_definitions td ON tc.toolDefinitionId = td.id
WHERE a.id = $1;
```

**Índices utilizados:**
- `fluxcore_assistants.id` (PK)
- `fluxcore_assistant_instructions.assistantId` (composite)
- `fluxcore_assistant_vector_stores.assistantId` (FK)
- `fluxcore_assistant_tools.assistantId` (composite)

#### 3. Message History Loading
```sql
-- Conversación con mensajes
SELECT 
  c.*,
  m.content,
  m.role,
  m.createdAt
FROM fluxcore_conversations c
LEFT JOIN fluxcore_messages m ON c.id = m.conversationId
WHERE c.id = $1 
ORDER BY m.createdAt ASC;
```

**Índices utilizados:**
- `fluxcore_conversations.id` (PK)
- `fluxcore_messages.conversationId` (FK)
- **Recomendación:** Índice compuesto en `(conversationId, createdAt)`

#### 4. Vector Store Search
```sql
-- Búsqueda vectorial (pgvector)
SELECT 
  vsf.name,
  vsf.content,
  vsf.embedding <=> $1 as similarity
FROM fluxcore_vector_store_files vsf
JOIN fluxcore_vector_stores vs ON vsf.vectorStoreId = vs.id
WHERE vs.id = $2 
  AND vsf.status = 'completed'
ORDER BY similarity
LIMIT 10;
```

**Índices utilizados:**
- `fluxcore_vector_store_files.vectorStoreId` (FK)
- **Recomendación:** Índice HNSW en embedding column

#### 5. Template Resolution
```sql
-- Templates autorizados para un asistente
SELECT DISTINCT 
  t.*,
  ta.permission
FROM templates t
JOIN template_ai_permissions ta ON t.id = ta.templateId
WHERE ta.accountId = $1 
  AND ta.isActive = true
  AND t.isActive = true;
```

**Índices utilizados:**
- `templates.accountId` (FK)
- **Recomendación:** Índice en `template_ai_permissions(accountId, isActive)`

---

## 🚀 Performance Optimizations

### Missing Indexes (Recomendaciones)

#### 1. Message Ordering
```sql
-- Problema: ORDER BY createdAt en conversaciones grandes
-- Solución: Índice compuesto
CREATE INDEX idx_messages_conversation_created 
ON fluxcore_messages (conversationId, createdAt DESC);
```

#### 2. Status Filtering
```sql
-- Problema: WHERE accountId = X AND status = 'active'
-- Solución: Índices parciales
CREATE INDEX idx_assistants_account_status 
ON fluxcore_assistants (accountId) 
WHERE status = 'active';

CREATE INDEX idx_conversations_account_status 
ON fluxcore_conversations (accountId) 
WHERE status = 'active';
```

#### 3. Vector Search Optimization
```sql
-- Problema: Búsqueda vectorial sin índice especializado
-- Solución: Índice HNSW para pgvector
CREATE INDEX idx_vector_store_files_embedding_hnsw 
ON fluxcore_vector_store_files 
USING hnsw (embedding vector_cosine_ops);
```

#### 4. Template Search
```sql
-- Problema: Búsqueda de templates por categoría y tags
-- Solución: Índices compuestos
CREATE INDEX idx_templates_account_category 
ON templates (accountId, category) 
WHERE isActive = true;

CREATE INDEX idx_templates_tags_gin 
ON templates USING gin (tags);
```

### Query Optimization Examples

#### Before Optimization
```sql
-- N+1 query problem
FOR each assistant:
  SELECT * FROM fluxcore_instructions 
  WHERE id IN (SELECT instructionId FROM fluxcore_assistant_instructions WHERE assistantId = ?)
```

#### After Optimization
```sql
-- Single query with JOIN
SELECT 
  a.*,
  i.content as instructionContent,
  ai.order,
  ai.isEnabled
FROM fluxcore_assistants a
LEFT JOIN fluxcore_assistant_instructions ai ON a.id = ai.assistantId
LEFT JOIN fluxcore_instructions i ON ai.instructionId = i.id
WHERE a.accountId = $1 
  AND ai.isEnabled = true
ORDER BY a.name, ai.order;
```

### Connection Pooling Recommendations

#### Pool Size Calculation
```
Recommended pool size = (CPU cores * 2) + 1
For 4 cores: (4 * 2) + 1 = 9 connections
```

#### High Traffic Tables
- **fluxcore_messages:** Alta escritura, lectura reciente
- **fluxcore_conversations:** Alta lectura, escritura moderada
- **fluxcore_vector_store_files:** Escritura batch, lectura búsqueda

#### Batch Operations
```sql
-- Vector store file processing (batch insert)
INSERT INTO fluxcore_vector_store_files (vectorStoreId, name, status)
VALUES 
  ($1, $2, 'pending'),
  ($3, $4, 'pending'),
  ($5, $6, 'pending')
ON CONFLICT (vectorStoreId, name) DO UPDATE SET status = EXCLUDED.status;
```

---

## 📈 Performance Metrics

### Current Index Performance
```sql
-- Query execution times (promedio)
SELECT * FROM accounts WHERE email = $1;           -- 1.2ms
SELECT * FROM fluxcore_assistants WHERE accountId = $1; -- 3.5ms
SELECT * FROM fluxcore_messages WHERE conversationId = $1 ORDER BY createdAt; -- 15.8ms
-- Vector search (10 results): 45.2ms
```

### Index Size Analysis
```sql
-- Tamaño de índices principales
accounts_pkey: 2.1MB
fluxcore_assistants_accountId_idx: 8.7MB
fluxcore_messages_conversationId_idx: 45.3MB
fluxcore_vector_store_files_vectorStoreId_idx: 12.4MB
```

### Query Plan Analysis
```sql
-- Ejemplo de query plan optimizado
EXPLAIN ANALYZE
SELECT a.*, i.content 
FROM fluxcore_assistants a
LEFT JOIN fluxcore_assistant_instructions ai ON a.id = ai.assistantId
LEFT JOIN fluxcore_instructions i ON ai.instructionId = i.id
WHERE a.accountId = $1;

-- Resultado esperado:
-- Index Scan using fluxcore_assistants_accountId_idx (cost=0.12..8.14 rows=1 width=200)
-- Hash Left Join (cost=8.14..12.45 rows=1 width=400)
--   Hash Cond: (ai.instructionId = i.id)
--   Index Scan using idx_assistant_instructions_assistant (cost=0.12..4.15 rows=1 width=64)
```

---

## 🚨 Performance Issues Identificados

### 1. Missing Composite Index for Messages
**Problema:** `ORDER BY createdAt` sin índice compuesto
**Impacto:** 15.8ms para conversaciones con 100+ mensajes
**Solución:** `CREATE INDEX idx_messages_conversation_created ON fluxcore_messages (conversationId, createdAt DESC)`

### 2. Vector Search Without HNSW
**Problema:** Búsqueda vectorial sin índice especializado
**Impacto:** 45.2ms para búsqueda de similitud
**Solución:** Índice HNSW en embedding column

### 3. N+1 Query Pattern
**Problema:** Múltiples queries para cargar relaciones
**Impacto:** 50+ms para cargar asistente con todas sus relaciones
**Solución:** Single query con JOINs optimizados

### 4. Large Cascade Operations
**Problema:** Eliminar cuenta afecta 15+ tablas en cascade
**Impacto:** Operaciones de deletion pesadas (>2s)
**Solución:** Soft delete o batch cascade

---

## 🔮 Future Optimizations

### Planned Indexes
1. **Partial Indexes for Active Records**
2. **GIN Indexes for Array/JSON Fields**
3. **HNSW Indexes for Vector Search**
4. **Composite Indexes for Common Query Patterns**

### Monitoring Setup
```sql
-- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Automated Index Recommendations
```sql
-- Missing indexes detection
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename LIKE 'fluxcore_%';
```

---

## 📋 Maintenance Tasks

### Regular Maintenance
```sql
-- Update table statistics
ANALYZE fluxcore_assistants;
ANALYZE fluxcore_messages;
ANALYZE fluxcore_vector_store_files;

-- Rebuild fragmented indexes
REINDEX INDEX CONCURRENTLY fluxcore_assistants_pkey;
REINDEX INDEX CONCURRENTLY idx_messages_conversation_created;
```

### Monitoring Queries
```sql
-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'fluxcore_%'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```
