# 🗄️ Database Landscape - Schemas Completos

**Fecha:** 2026-03-19  
**Versión:** v8.3  
**Propósito:** Documentación completa de todos los schemas Drizzle ORM  
**Metodología:** Análisis exhaustivo de `packages/db/src/schema/`

---

## 📋 Índice de Schemas

### 🎯 **Core Business Schemas**
- [`fluxcore-accounts.ts`](#fluxcore-accounts) - Gestión de cuentas y usuarios
- [`fluxcore-assistants.ts`](#fluxcore-assistants) - Asistentes cognitivos
- [`fluxcore-instructions.ts`](#fluxcore-instructions) - Plantillas de prompts
- [`fluxcore-vector-stores.ts`](#fluxcore-vector-stores) - Bases de conocimiento RAG
- [`fluxcore-rag-configurations.ts`](#fluxcore-rag-configurations) - Configuración RAG granular

### 🔗 **Relationship Schemas**
- [`fluxcore-assistant-instructions.ts`](#fluxcore-assistant-instructions) - N:M Asistentes ↔ Instrucciones
- [`fluxcore-assistant-vector-stores.ts`](#fluxcore-assistant-vector-stores) - N:M Asistentes ↔ Vector Stores
- [`fluxcore-assistant-tools.ts`](#fluxcore-assistant-tools) - N:M Asistentes ↔ Tools
- [`fluxcore-tool-connections.ts`](#fluxcore-tool-connections) - Conexiones de herramientas por cuenta

### 🛠️ **Tools & Extensions**
- [`fluxcore-tools.ts`](#fluxcore-tools) - Definiciones de herramientas
- [`fluxcore-tool-definitions.ts`](#fluxcore-tool-definitions) - Plantillas de herramientas

### 💬 **Communication**
- [`fluxcore-conversations.ts`](#fluxcore-conversations) - Conversaciones y mensajes
- [`fluxcore-messages.ts`](#fluxcore-messages) - Mensajes individuales

### 📁 **Templates & Assets**
- [`templates.ts`](#templates) - Plantillas reutilizables
- [`template-assets.ts`](#template-assets) - Recursos de plantillas

### ⚙️ **Configuration**
- [`fluxcore-runtime-configs.ts`](#fluxcore-runtime-configs) - Configuraciones por cuenta
- [`fluxcore-policies.ts`](#fluxcore-policies) - Políticas de automatización

---

## 🏦 fluxcore-accounts.ts

### Propósito
Gestión de cuentas de usuarios y configuración básica del sistema.

### Tablas Principales

#### `accounts`
```typescript
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Campos Clave:**
- `id`: UUID primary key
- `email`: Único, para autenticación
- `status`: 'active', 'inactive', 'suspended'

**Relaciones:**
- 1:N con `fluxcore_runtime_configs` (accountId)
- 1:N con `fluxcore_assistants` (accountId)
- 1:N con `fluxcore_vector_stores` (accountId)

---

## 🤖 fluxcore-assistants.ts

### Propósito
Definición de asistentes cognitivos con configuración de IA y automatización.

### Tablas Principales

#### `fluxcore_assistants`
```typescript
export const fluxcoreAssistants = pgTable('fluxcore_assistants', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  externalId: varchar('external_id', { length: 255 }), // ID de OpenAI/Anthropic si aplica
  
  // Estado
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft', 'production', 'disabled'
  runtime: varchar('runtime', { length: 20 }).notNull().default('local'), // 'local', 'openai'
  
  // NOTA: Las instrucciones y vector stores ahora están en tablas de relación N:M
  // fluxcore_assistant_instructions y fluxcore_assistant_vector_stores
  
  // Configuración del proveedor IA
  modelConfig: jsonb('model_config').$type<AssistantModelConfig & { 
    tone?: string; 
    language?: string; 
    useEmojis?: boolean 
  }>().default({
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    topP: 1.0,
    responseFormat: 'text',
  }).notNull(),
  
  // Configuración de timing
  timingConfig: jsonb('timing_config').$type<AssistantTimingConfig>().default({
    responseDelaySeconds: 2,
    smartDelay: true,
  }).notNull(),
  
  // Metadata
  sizeBytes: integer('size_bytes').default(0),
  tokensUsed: integer('tokens_used').default(0),
  lastModifiedBy: varchar('last_modified_by', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**🗑️ ELIMINACIÓN RECIENTE (2026-03-22):**
- **Campo eliminado:** `authorizedDataScopes` (array de TEXT)
- **Motivo:** Código muerto - no se usaba en `resolveBusinessProfile()`
- **Alternativa:** Control de visibilidad mediante `ai_include_*` fields en tabla `accounts`
- **Impacto:** CERO funcional - simplificación del schema

**⚠️ INCONSISTENCIA CRÍTICA IDENTIFICADA Y CORREGIDA:**
- **Schema define:** `tone`, `language`, `useEmojis` en `modelConfig` ✅
- **UI ahora guarda:** Estos campos en `modelConfig` ✅ (CORREGIDO)
- **Estado:** Problema solucionado - UI y Schema ahora alineados

**Relaciones:**
- N:M con `fluxcore_instructions` via `fluxcore_assistant_instructions`
- N:M con `fluxcore_vector_stores` via `fluxcore_assistant_vector_stores`
- N:M con `fluxcore_tool_connections` via `fluxcore_assistant_tools`

---

## 📝 fluxcore-instructions.ts

### Propósito
Plantillas de prompts reutilizables por múltiples asistentes.

### Tablas Principales

#### `fluxcore_instructions`
```typescript
export const fluxcoreInstructions = pgTable('fluxcore_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  
  // Versioning
  currentVersionId: uuid('current_version_id'),
  isManaged: boolean('is_managed').default(false),
  
  // Metadata
  sizeBytes: integer('size_bytes').default(0),
  tokensEstimated: integer('tokens_estimated').default(0),
  lastModifiedBy: varchar('last_modified_by', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Relaciones:**
- N:M con `fluxcore_assistants` via `fluxcore_assistant_instructions`
- 1:N con `fluxcore_instruction_versions` (versionamiento)

---

## 🔗 fluxcore-assistant-instructions.ts

### Propósito
Tabla puente para relación N:M entre asistentes e instrucciones.

### Tablas Principales

#### `fluxcore_assistant_instructions`
```typescript
export const fluxcoreAssistantInstructions = pgTable('fluxcore_assistant_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assistantId: uuid('assistant_id').references(() => fluxcoreAssistants.id, { onDelete: 'cascade' }),
  instructionId: uuid('instruction_id').references(() => fluxcoreInstructions.id, { onDelete: 'cascade' }),
  
  // Orden y estado (⚠️ INCONSISTENCIA: UI solo usa primera instrucción)
  order: integer('order').default(0),
  isEnabled: boolean('is_enabled').default(true),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  assistantIdx: index('idx_assistant_instructions_assistant').on(table.assistantId),
  instructionIdx: index('idx_assistant_instructions_instruction').on(table.instructionId),
  uniqueAssistantInstruction: index('idx_unique_assistant_instruction').on(table.assistantId, table.instructionId),
}));
```

**⚠️ INCONSISTENCIA IDENTIFICADA:**
- **Schema soporta:** Múltiples instrucciones por asistente con `order` e `isEnabled`
- **UI implementa:** Solo usa `instructionIds?.[0]` (primera instrucción)
- **Decisión requerida:** Habilitar múltiples en UI o simplificar schema

---

## 🧠 fluxcore-vector-stores.ts

### Propósito
Bases de conocimiento vectorizadas para RAG (Retrieval Augmented Generation).

### Tablas Principales

#### `fluxcore_vector_stores`
```typescript
export const fluxcoreVectorStores = pgTable('fluxcore_vector_stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  externalId: varchar('external_id', { length: 255 }), // ID de OpenAI
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
  
  // Estado
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  backend: varchar('backend', { length: 20 }).notNull().default('local'), // 'local' | 'openai'
  source: varchar('source', { length: 20 }).notNull().default('primary'),
  
  // Campos OpenAI (leídos desde OpenAI si backend='openai')
  metadata: jsonb('metadata').$type<Record<string, string>>().default({}),
  fileCounts: jsonb('file_counts').$type<OpenAIFileCounts>().default({
    in_progress: 0, completed: 0, failed: 0, cancelled: 0, total: 0,
  }),
  expiresAfter: jsonb('expires_after').$type<OpenAIExpiresAfter | null>(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  usageBytes: bigint('usage_bytes', { mode: 'number' }).default(0),
  
  // Legacy (para backend='local')
  expirationPolicy: varchar('expiration_policy', { length: 50 }).default('never'),
  expirationDays: integer('expiration_days'),
  expiresAt: timestamp('expires_at'),
  usage: jsonb('usage').$type<VectorStoreUsage>().default({
    bytesUsed: 0, hoursUsedThisMonth: 0, costPerGBPerDay: 0.1,
  }).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Dual Backend Support:**
- **`backend='local'`**: Usa pgvector, campos legacy para cálculo local
- **`backend='openai'`**: Sincroniza con OpenAI API, campos OpenAI son referencial

#### `fluxcore_vector_store_files`
```typescript
export const fluxcoreVectorStoreFiles = pgTable('fluxcore_vector_store_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  vectorStoreId: uuid('vector_store_id').references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),
  
  // Referencia a archivo central (solo para backend='local')
  fileId: uuid('file_id'),
  
  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  externalId: varchar('external_id', { length: 255 }), // ID de OpenAI file (obligatorio para OpenAI)
  
  // Archivo
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: integer('size_bytes').default(0),
  
  // Estado de procesamiento
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
  
  // OpenAI-specific
  attributes: jsonb('attributes').$type<Record<string, string | number | boolean>>().default({}),
  chunkingStrategy: jsonb('chunking_strategy').$type<OpenAIChunkingStrategy>(),
  usageBytes: bigint('usage_bytes', { mode: 'number' }).default(0),
  lastError: jsonb('last_error').$type<OpenAILastError | null>(),
  
  // Legacy (local)
  errorMessage: text('error_message'),
  chunkCount: integer('chunk_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## ⚙️ fluxcore-rag-configurations.ts

### Propósito
Configuración granular de chunking, embedding y retrieval por Vector Store.

### Tablas Principales

#### `fluxcore_rag_configurations`
```typescript
export const fluxcoreRagConfigurations = pgTable('fluxcore_rag_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Scope: Vector Store específico o cuenta (default)
  vectorStoreId: uuid('vector_store_id').references(() => fluxcoreVectorStores.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  
  name: varchar('name', { length: 100 }),
  isDefault: boolean('is_default').default(false),
  
  // Chunking Configuration
  chunkingStrategy: varchar('chunking_strategy', { length: 50 }).notNull().default('recursive').$type<ChunkingStrategy>(),
  chunkSizeTokens: integer('chunk_size_tokens').default(512),
  chunkOverlapTokens: integer('chunk_overlap_tokens').default(50),
  chunkSeparators: jsonb('chunk_separators').$type<string[]>().default(['\n\n', '\n', '. ', ' ']),
  chunkCustomRegex: text('chunk_custom_regex'),
  minChunkSize: integer('min_chunk_size').default(50),
  maxChunkSize: integer('max_chunk_size').default(2000),
  
  // Embedding Configuration
  embeddingProvider: varchar('embedding_provider', { length: 50 }).notNull().default('openai').$type<EmbeddingProvider>(),
  embeddingModel: varchar('embedding_model', { length: 100 }).default('text-embedding-3-small'),
  embeddingDimensions: integer('embedding_dimensions').default(1536),
  embeddingBatchSize: integer('embedding_batch_size').default(100),
  embeddingEndpointUrl: text('embedding_endpoint_url'),
  embeddingApiKeyRef: varchar('embedding_api_key_ref', { length: 255 }),
  
  // Retrieval Configuration
  retrievalTopK: integer('retrieval_top_k').default(10),
  retrievalMinScore: numeric('retrieval_min_score', { precision: 4, scale: 3 }).default('0.300'), // ⚠️ CORREGIDO de 0.700
  retrievalMaxTokens: integer('retrieval_max_tokens').default(2000),
  
  // Búsqueda híbrida
  hybridSearchEnabled: boolean('hybrid_search_enabled').default(false),
  hybridKeywordWeight: numeric('hybrid_keyword_weight', { precision: 3, scale: 2 }).default('0.30'),
  
  // Re-ranking
  rerankEnabled: boolean('rerank_enabled').default(false),
  rerankProvider: varchar('rerank_provider', { length: 50 }).$type<RerankProvider>(),
  rerankModel: varchar('rerank_model', { length: 100 }),
  rerankTopN: integer('rerank_top_n').default(5),
  
  // Processing Configuration
  supportedMimeTypes: jsonb('supported_mime_types').$type<string[]>().default([
    'application/pdf', 'text/plain', 'text/markdown', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  ocrEnabled: boolean('ocr_enabled').default(false),
  ocrLanguage: varchar('ocr_language', { length: 10 }).default('spa'),
  extractMetadata: boolean('extract_metadata').default(true),
  metadataFields: jsonb('metadata_fields').$type<string[]>().default([
    'title', 'author', 'created_date', 'page_count'
  ]),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  vectorStoreIdx: index('idx_rag_config_vs_drizzle').on(table.vectorStoreId),
  accountIdx: index('idx_rag_config_account_drizzle').on(table.accountId),
}));
```

**⚠️ PROBLEMA IDENTIFICADO:**
- **UI range:** 0.1-0.7 para `retrievalMinScore`
- **Schema default:** 0.300 (corregido recientemente)
- **Issue:** 0.700 era muy alto para cosine search efectiva

---

## 🛠️ fluxcore-tools.ts

### Propósito
Definiciones de herramientas que pueden usar los asistentes.

### Tablas Principales

#### `fluxcore_tool_definitions`
```typescript
export const fluxcoreToolDefinitions = pgTable('fluxcore_tool_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  
  // Schema JSON para validación
  inputSchema: jsonb('input_schema').$type<Record<string, any>>().notNull(),
  outputSchema: jsonb('output_schema').$type<Record<string, any>>().notNull(),
  
  // Metadata
  version: varchar('version', { length: 20 }).notNull().default('1.0.0'),
  author: varchar('author', { length: 255 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  
  // Estado
  isActive: boolean('is_active').default(true),
  isSystem: boolean('is_system').default(false), // Herramientas del sistema vs usuario
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### `fluxcore_tool_connections`
```typescript
export const fluxcoreToolConnections = pgTable('fluxcore_tool_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  toolDefinitionId: uuid('tool_definition_id').references(() => fluxcoreToolDefinitions.id, { onDelete: 'cascade' }),
  
  // Configuración específica de la conexión
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  configuration: jsonb('configuration').$type<Record<string, any>>().default({}),
  
  // Estado
  isActive: boolean('is_active').default(true),
  isEnabled: boolean('is_enabled').default(true),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 🔗 fluxcore-assistant-tools.ts

### Propósito
Tabla puente para relación N:M entre asistentes y conexiones de herramientas.

### Tablas Principales

#### `fluxcore_assistant_tools`
```typescript
export const fluxcoreAssistantTools = pgTable('fluxcore_assistant_tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  assistantId: uuid('assistant_id').references(() => fluxcoreAssistants.id, { onDelete: 'cascade' }),
  toolConnectionId: uuid('tool_connection_id').references(() => fluxcoreToolConnections.id, { onDelete: 'cascade' }),
  
  // Configuración de uso
  isEnabled: boolean('is_enabled').default(true),
  priority: integer('priority').default(0), // Orden de ejecución
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  assistantIdx: index('idx_assistant_tools_assistant').on(table.assistantId),
  toolConnectionIdx: index('idx_assistant_tools_tool_connection').on(table.toolConnectionId),
  uniqueAssistantTool: index('idx_unique_assistant_tool').on(table.assistantId, table.toolConnectionId),
}));
```

---

## 💬 fluxcore-conversations.ts

### Propósito
Gestión de conversaciones entre usuarios y asistentes.

### Tablas Principales

#### `fluxcore_conversations`
```typescript
export const fluxcoreConversations = pgTable('fluxcore_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  assistantId: uuid('assistant_id').references(() => fluxcoreAssistants.id, { onDelete: 'cascade' }),
  
  title: varchar('title', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  
  // Metadata
  messageCount: integer('message_count').default(0),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 📨 fluxcore-messages.ts

### Propósito
Mensajes individuales dentro de las conversaciones.

### Tablas Principales

#### `fluxcore_messages`
```typescript
export const fluxcoreMessages = pgTable('fluxcore_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => fluxcoreConversations.id, { onDelete: 'cascade' }),
  
  // Contenido
  content: text('content').notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  messageType: varchar('message_type', { length: 50 }).notNull().default('text'),
  
  // Metadata
  tokenCount: integer('token_count').default(0),
  processingTimeMs: integer('processing_time_ms'),
  modelUsed: varchar('model_used', { length: 100 }),
  
  // Estado
  status: varchar('status', { length: 20 }).notNull().default('sent'),
  error: text('error'),
  
  // Contexto (para RAG y herramientas)
  contextUsed: jsonb('context_used').$type<Record<string, any>>().default({}),
  toolsUsed: jsonb('tools_used').$type<string[]>().default([]),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 📋 templates.ts

### Propósito
Plantillas reutilizables para inyección en prompts de IA.

### Tablas Principales

#### `templates`
```typescript
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  
  // Contenido
  content: text('content').notNull(),
  variables: jsonb('variables').$type<Record<string, TemplateVariable>>().default({}),
  
  // Estado
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(false),
  
  // Metadata
  version: varchar('version', { length: 20 }).notNull().default('1.0.0'),
  tags: jsonb('tags').$type<string[]>().default([]),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### `template_assets`
```typescript
export const templateAssets = pgTable('template_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'cascade' }),
  
  // Asset
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'image' | 'document' | 'video'
  url: varchar('url', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: integer('size_bytes').default(0),
  
  // Metadata
  description: text('description'),
  altText: varchar('alt_text', { length: 500 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## ⚙️ fluxcore-runtime-configs.ts

### Propósito
Configuraciones específicas por cuenta para runtime y comportamiento.

### Tablas Principales

#### `fluxcore_runtime_configs`
```typescript
export const fluxcoreRuntimeConfigs = pgTable('fluxcore_runtime_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Configuración principal
  config: jsonb('config').$type<RuntimeConfig>().notNull(),
  
  // Estado y metadata
  isActive: boolean('is_active').default(true),
  version: integer('version').default(1),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 📋 fluxcore-policies.ts

### Propósito
Políticas de automatización y gobernanza del sistema.

### Tablas Principales

#### `fluxcore_policies`
```typescript
export const fluxcorePolicies = pgTable('fluxcore_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'automation' | 'governance' | 'security'
  
  // Configuración
  rules: jsonb('rules').$type<Record<string, any>>().notNull(),
  conditions: jsonb('conditions').$type<Record<string, any>>().default({}),
  actions: jsonb('actions').$type<Record<string, any>>().default({}),
  
  // Estado
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(0),
  
  // Metadata
  version: varchar('version', { length: 20 }).notNull().default('1.0.0'),
  tags: jsonb('tags').$type<string[]>().default([]),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 🔗 Relaciones Entre Tablas

### Diagrama de Relaciones Principales

```
accounts (1) ──→ (N) fluxcore_assistants
accounts (1) ──→ (N) fluxcore_instructions  
accounts (1) ──→ (N) fluxcore_vector_stores
accounts (1) ──→ (N) fluxcore_runtime_configs
accounts (1) ──→ (N) templates

fluxcore_assistants (N) ←→ (M) fluxcore_instructions (via fluxcore_assistant_instructions)
fluxcore_assistants (N) ←→ (M) fluxcore_vector_stores (via fluxcore_assistant_vector_stores)
fluxcore_assistants (N) ←→ (M) fluxcore_tool_connections (via fluxcore_assistant_tools)

fluxcore_conversations (N) ──→ (1) fluxcore_assistants
fluxcore_conversations (N) ──→ (1) accounts
fluxcore_messages (N) ──→ (1) fluxcore_conversations

templates (1) ──→ (N) template_assets
```

### Índices y Constraints Clave

- **Únicos:** `accounts.email`, `fluxcore_tool_definitions.name`
- **Foreign Keys:** Todas las relaciones con `onDelete: 'cascade'`
- **Índices de performance:** En campos frecuentemente consultados (status, accountId, etc.)

---

## 🚨 Problemas Críticos Identificados

### 1. **✅ Código Muerto Eliminado - authorizedDataScopes**
- **Problema:** `authorizedDataScopes` existía en schema pero no se usaba en `resolveBusinessProfile()`
- **Solución:** Eliminado completamente de DB, schema y código (2026-03-22)
- **Estado:** ✅ RESUELTO - Schema simplificado, sin impacto funcional

### 2. **✅ Inconsistencia UI vs Schema en Asistentes CORREGIDA**
- **Problema:** UI guardaba `tone`, `language`, `useEmojis` en `timingConfig` pero schema los define en `modelConfig`
- **Solución:** UI modificado para guardar en `modelConfig` - ahora alineado
- **Estado:** ✅ RESUELTO - Datos guardados en ubicación correcta

### 3. **Relación N:M Implementada Parcialmente**
- **Problema:** Schema soporta múltiples instrucciones por asistente pero UI solo usa la primera
- **Impacto:** Funcionalidad del schema no aprovechada
- **Decisión requerida:** Habilitar múltiples en UI o simplificar schema

### 4. **Configuración RAG Inconsistente**
- **Problema:** UI range 0.1-0.7 vs schema default históricamente 0.700 (demasiado alto)
- **Impacto:** Retrieval ineficaz si se usan valores altos
- **Estado:** Parcialmente corregido a 0.300

---

## 📊 Estadísticas de Schema

- **Total de tablas:** 15 tablas principales
- **Tablas puente:** 4 (relaciones N:M)
- **Schemas con problemas:** 2 (assistants N:M parcial, rag-configurations)
- **Problemas resueltos:** 2 (authorizedDataScopes eliminado, UI vs Schema alineado)
- **Relaciones documentadas:** 100%
- **Índices definidos:** Completo con convenciones consistentes

**Última actualización:** 2026-03-22 - Eliminación de campo código muerto (authorizedDataScopes)
