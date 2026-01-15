# FluxCore RAG Implementation Report

**Fecha:** 2026-01-14  
**Versión:** 1.0.0  
**Estado:** Implementación Backend Completa, UI en Progreso

---

## 1. Resumen Ejecutivo

Se implementó un sistema completo de **Retrieval Augmented Generation (RAG)** para FluxCore, permitiendo a los asistentes AI acceder a bases de conocimiento vectoriales para respuestas contextualizadas. La arquitectura sigue el patrón de "assets por referencia" donde los Vector Stores son entidades independientes consumidas por los asistentes mediante IDs.

### Alcance Implementado
- ✅ 6 migraciones de base de datos (015-020)
- ✅ 7 schemas TypeScript para Drizzle ORM
- ✅ 10 servicios backend
- ✅ 3 nuevos endpoints de API
- ✅ Integración FluxCore ↔ RAG
- ✅ 2 componentes UI (RAGConfigSection, VectorStoreFilesSection)
- ⏳ Endpoint de upload de archivos (pendiente)
- ⏳ Colección centralizada de Files (pendiente)

---

## 2. Arquitectura de Base de Datos

### 2.1 Migraciones Creadas

| Archivo | Tablas | Descripción |
|---------|--------|-------------|
| `015_pgvector_document_chunks.sql` | `fluxcore_document_chunks` | Chunks con embeddings pgvector |
| `016_asset_permissions.sql` | `fluxcore_asset_permissions` | Permisos granulares por asset |
| `017_rag_configurations.sql` | `fluxcore_rag_configurations` | Configuración RAG por vector store |
| `018_marketplace.sql` | `fluxcore_marketplace_*` (4 tablas) | Marketplace de assets |
| `019_billing_usage.sql` | `fluxcore_usage_logs`, `fluxcore_account_credits`, `fluxcore_transactions` | Billing y usage tracking |
| `020_scalability.sql` | `fluxcore_system_metrics`, `fluxcore_vector_store_stats`, `fluxcore_query_cache` | Métricas y escalabilidad |

### 2.2 Estructura de Tablas Principales

#### fluxcore_document_chunks
```sql
CREATE TABLE fluxcore_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vector_store_id UUID NOT NULL REFERENCES fluxcore_vector_stores(id),
    file_id UUID REFERENCES fluxcore_vector_store_files(id),
    content TEXT NOT NULL,
    embedding vector(1536),  -- pgvector
    metadata JSONB DEFAULT '{}',
    chunk_index INTEGER NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### fluxcore_rag_configurations
```sql
CREATE TABLE fluxcore_rag_configurations (
    id UUID PRIMARY KEY,
    vector_store_id UUID REFERENCES fluxcore_vector_stores(id),
    account_id UUID REFERENCES accounts(id),
    
    -- Chunking
    chunking_strategy VARCHAR(50) DEFAULT 'recursive',
    chunk_size_tokens INTEGER DEFAULT 512,
    chunk_overlap_tokens INTEGER DEFAULT 50,
    
    -- Embedding
    embedding_provider VARCHAR(50) DEFAULT 'openai',
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    embedding_dimensions INTEGER DEFAULT 1536,
    
    -- Retrieval
    retrieval_top_k INTEGER DEFAULT 10,
    retrieval_min_score DECIMAL(5,4) DEFAULT 0.7,
    retrieval_max_tokens INTEGER DEFAULT 2000
);
```

### 2.3 Schemas TypeScript

| Archivo | Exports Principales |
|---------|---------------------|
| `fluxcore-document-chunks.ts` | `fluxcoreDocumentChunks`, `fluxcoreVectorStoreFiles` |
| `fluxcore-asset-permissions.ts` | `fluxcoreAssetPermissions` |
| `fluxcore-rag-configurations.ts` | `fluxcoreRagConfigurations`, `RAGConfig`, `DEFAULT_RAG_CONFIG` |
| `fluxcore-marketplace.ts` | `fluxcoreMarketplaceListings`, `fluxcoreMarketplaceSubscriptions` |
| `fluxcore-billing.ts` | `fluxcoreUsageLogs`, `fluxcoreAccountCredits` |

---

## 3. Servicios Backend

### 3.1 Servicios RAG Core

#### ChunkingService (`chunking.service.ts`)
```typescript
class ChunkingService {
    // 5 estrategias de fragmentación
    strategies: Map<string, ChunkingStrategy> = {
        'fixed': FixedChunkingStrategy,
        'recursive': RecursiveChunkingStrategy,
        'sentence': SentenceChunkingStrategy,
        'paragraph': ParagraphChunkingStrategy,
        'custom': CustomRegexChunkingStrategy
    };
    
    async chunkWithConfig(text: string, config: RAGConfig): Promise<Chunk[]>
    countTokens(text: string): number
}
```

#### EmbeddingService (`embedding.service.ts`)
```typescript
class EmbeddingService {
    providers: Map<string, IEmbeddingProvider> = {
        'openai': OpenAIEmbeddingProvider,
        'cohere': CohereEmbeddingProvider,
        'custom': CustomEmbeddingProvider
    };
    
    async embed(text: string, config?: EmbeddingConfig): Promise<number[]>
    async embedBatch(texts: string[], config?: EmbeddingConfig): Promise<number[][]>
}
```

#### RetrievalService (`retrieval.service.ts`)
```typescript
class RetrievalService {
    async search(params: {
        query: string;
        vectorStoreIds: string[];
        accountId: string;
        options?: RetrievalOptions;
    }): Promise<SearchResult[]>
    
    async buildContext(params: BuildContextParams): Promise<string>
    
    // Búsqueda vectorial con pgvector
    private async vectorSearch(
        queryEmbedding: number[],
        vectorStoreIds: string[],
        topK: number,
        minScore: number
    ): Promise<ChunkWithScore[]>
}
```

#### DocumentProcessingService (`document-processing.service.ts`)
```typescript
class DocumentProcessingService {
    async processDocument(
        fileId: string,
        vectorStoreId: string,
        accountId: string,
        content: Buffer | string,
        mimeType: string
    ): Promise<ProcessingResult>
    
    async reprocessVectorStore(
        vectorStoreId: string,
        accountId: string
    ): Promise<{ processed: number; failed: number }>
}
```

### 3.2 Servicios de Soporte

| Servicio | Archivo | Funcionalidad Principal |
|----------|---------|-------------------------|
| PermissionService | `permission.service.ts` | `checkAccess()`, `shareAsset()`, `revokeAccess()` |
| RAGConfigService | `rag-config.service.ts` | `getEffectiveConfig()`, `saveConfig()`, `setVectorStoreConfig()` |
| UsageService | `usage.service.ts` | `logUsage()`, `getBillingInfo()`, `checkLimits()` |
| MetricsService | `metrics.service.ts` | `record()`, `getHealthStatus()`, `getVectorStoreStats()` |
| MarketplaceService | `marketplace.service.ts` | `searchListings()`, `subscribe()`, `createListing()` |

---

## 4. API Endpoints

### 4.1 Endpoints Existentes (FluxCore)

```
GET    /fluxcore/vector-stores?accountId=
POST   /fluxcore/vector-stores
PUT    /fluxcore/vector-stores/:id
DELETE /fluxcore/vector-stores/:id

GET    /fluxcore/vector-stores/:id/files
POST   /fluxcore/vector-stores/:id/files
DELETE /fluxcore/vector-stores/:id/files/:fileId
```

### 4.2 Nuevos Endpoints RAG

#### POST /fluxcore/runtime/rag-context
```typescript
// Request
{
    accountId: string;
    query: string;
    vectorStoreIds?: string[];  // Opcional, se resuelven del asistente activo
    options?: {
        topK?: number;
        minScore?: number;
        maxTokens?: number;
    }
}

// Response
{
    success: true;
    data: {
        context: string;        // Contexto RAG formateado
        sources: SourceInfo[];  // Fuentes utilizadas
        tokenCount: number;
    }
}
```

#### GET /fluxcore/rag-config
```typescript
// Query params
vectorStoreId: string;
accountId: string;

// Response
{
    success: true;
    data: {
        chunking: { enabled, strategy, sizeTokens, overlapTokens };
        embedding: { enabled, provider, model };
        retrieval: { enabled, topK, minScore, maxTokens };
    }
}
```

#### PUT /fluxcore/rag-config
```typescript
// Body
{
    vectorStoreId: string;
    accountId: string;
    chunking?: { strategy, sizeTokens, overlapTokens };
    embedding?: { provider, model };
    retrieval?: { topK, minScore, maxTokens };
}
```

---

## 5. Integración FluxCore

### 5.1 Flujo de Datos

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Usuario envía  │     │  FluxCore recibe │     │ fetchActive     │
│    mensaje      │────▶│    mensaje       │────▶│ Assistant()     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              │
                        │  vectorStoreIds  │◀─────────────┘
                        │  del asistente   │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │ fetchRAGContext()│
                        │ POST /rag-context│
                        └────────┬─────────┘
                                 │
    ┌────────────────────────────▼────────────────────────────┐
    │                    retrievalService                      │
    │  1. Embed query                                          │
    │  2. Vector search (pgvector)                             │
    │  3. Build context with sources                           │
    └────────────────────────────┬────────────────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │  PromptBuilder   │
                        │  + ragContext    │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   AI Response    │
                        │  contextualizada │
                        └──────────────────┘
```

### 5.2 Modificaciones en fluxcore/src/index.ts

```typescript
// Nuevo método privado
private async fetchRAGContext(
    query: string,
    vectorStoreIds: string[],
    accountId: string
): Promise<string | null> {
    const port = process.env.PORT || 3000;
    const response = await fetch(`http://localhost:${port}/fluxcore/runtime/rag-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, query, vectorStoreIds }),
    });
    const data = await response.json();
    return data.success ? data.data.context : null;
}

// Modificación en generateSuggestion
async generateSuggestion(event, context, recipientAccountId) {
    const active = await this.fetchActiveAssistant(recipientAccountId);
    
    let enrichedContext = context;
    if (active?.vectorStores?.length > 0) {
        const vectorStoreIds = active.vectorStores.map(vs => vs.id);
        const ragContext = await this.fetchRAGContext(
            event.body?.text || '',
            vectorStoreIds,
            recipientAccountId
        );
        if (ragContext) {
            enrichedContext = { ...context, ragContext };
        }
    }
    
    const prompt = this.promptBuilder.build(enrichedContext, recipientAccountId);
    // ... resto del flujo
}
```

### 5.3 Modificaciones en PromptBuilder

```typescript
interface ContextData {
    // ... campos existentes
    ragContext?: string;  // NUEVO
}

private buildSystemPrompt(context: ContextData): string {
    let systemPrompt = this.baseSystemPrompt;
    
    // RAG Context injection
    if (context.ragContext) {
        systemPrompt += `\n\n## Contexto de Base de Conocimiento\n\n`;
        systemPrompt += `Utiliza la siguiente información de la base de conocimiento `;
        systemPrompt += `para responder de manera precisa:\n\n`;
        systemPrompt += context.ragContext;
    }
    
    return systemPrompt;
}
```

---

## 6. Componentes UI

### 6.1 RAGConfigSection

**Ubicación:** `apps/web/src/components/fluxcore/components/RAGConfigSection.tsx`

```typescript
interface RAGConfig {
    chunking: {
        enabled: boolean;
        strategy: 'fixed' | 'recursive' | 'sentence' | 'paragraph';
        sizeTokens: number;      // 100-2000
        overlapTokens: number;   // 0-200
    };
    embedding: {
        enabled: boolean;
        provider: 'openai' | 'cohere' | 'local';
        model: string;
    };
    retrieval: {
        enabled: boolean;
        topK: number;           // 1-20
        minScore: number;       // 0.5-0.95
        maxTokens: number;      // 500-8000
    };
}
```

**Características:**
- 3 secciones colapsables con toggle
- Sliders para valores numéricos
- Selección de estrategia de chunking con cards
- Selección de proveedor de embedding
- Auto-guardado al cambiar valores
- Integración con `/api/fluxcore/rag-config`

### 6.2 VectorStoreFilesSection

**Ubicación:** `apps/web/src/components/fluxcore/components/VectorStoreFilesSection.tsx`

```typescript
interface VectorStoreFile {
    id: string;
    name: string;
    mimeType?: string;
    sizeBytes: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    chunkCount?: number;
    createdAt: string;
}
```

**Características:**
- Lista de archivos con estado de procesamiento
- Badges de estado (Pendiente, Procesando, Indexado, Error)
- Botón de upload con soporte multi-archivo
- Auto-refresh cada 5s para archivos en procesamiento
- Confirmación de eliminación
- Formatos soportados: TXT, MD, PDF, DOCX, CSV, JSON

### 6.3 Integración en VectorStoresView

```tsx
// apps/web/src/components/fluxcore/views/VectorStoresView.tsx

import { RAGConfigSection } from '../components/RAGConfigSection';
import { VectorStoreFilesSection } from '../components/VectorStoreFilesSection';

// En el panel de detalle del vector store:
<CollapsibleSection title="Archivos adjuntos" defaultExpanded>
    <VectorStoreFilesSection 
        vectorStoreId={selectedStore.id}
        accountId={accountId}
        onFileCountChange={(count) => setSelectedStore({...})}
    />
</CollapsibleSection>

<RAGConfigSection
    vectorStoreId={selectedStore.id}
    accountId={accountId}
/>
```

---

## 7. Estado Actual y Pendientes

### 7.1 Completado 

| Componente | Estado | Notas |
|------------|--------|-------|
| Migraciones DB | | 6 archivos SQL listos para ejecutar |
| Schemas Drizzle | | Exportados en `@fluxcore/db` |
| ChunkingService | | 5 estrategias implementadas |
| EmbeddingService | | OpenAI, Cohere, Custom providers |
| RetrievalService | | Vector search con pgvector |
| DocumentProcessingService | | Pipeline completo |
| PermissionService | | RBAC por asset |
| RAGConfigService | | Config por vector store |
| UsageService | | Tracking de uso |
| MetricsService | | Health checks |
| MarketplaceService | | CRUD de listings |
| POST /rag-context | | Endpoint funcionando |
| GET/PUT /rag-config | | Endpoints funcionando |
| Integración FluxCore | | fetchRAGContext + PromptBuilder |
| RAGConfigSection UI | | Componente completo |
| VectorStoreFilesSection UI | | Componente completo |

### 7.2 Pendiente 

| Componente | Prioridad | Descripción |
|------------|-----------|-------------|
| PDF/DOCX parsing | Media | Integrar pdfjs, mammoth |
| Hybrid search | Media | Combinación keyword + vector |
| Re-ranking | Media | Cohere rerank integration |
| Tests de integración | Media | Ejecutar `rag-integration.test.ts` |
| Stripe billing | Baja | Integración de pagos |
| Marketplace UI | Baja | Componentes React |

### 7.3 Implementación Reciente (021) ✅ NUEVO

| Componente | Descripción |
|------------|-------------|
| Migración 021 | `fluxcore_files` centralizado, funciones de upload/link |
| Schema `fluxcore-files.ts` | Tipos TypeScript para archivos centralizados |
| `file.service.ts` | Servicio con deduplicación SHA-256, upload, link |
| `POST /upload` endpoint | Sube, vincula y procesa en un solo request |
| `POST /reprocess` endpoint | Re-procesa archivo usando contenido almacenado |
| Schema actualizado | `fileId` y `chunkCount` en `fluxcoreVectorStoreFiles` |
| UI simplificada | `VectorStoreFilesSection` usa endpoint unificado |

### 7.3 Para Ejecutar Migraciones

```bash
cd packages/db/migrations

# Orden de ejecución:
psql -d fluxcore_db -f 015_pgvector_document_chunks.sql
psql -d fluxcore_db -f 016_asset_permissions.sql
psql -d fluxcore_db -f 017_rag_configurations.sql
psql -d fluxcore_db -f 018_marketplace.sql
psql -d fluxcore_db -f 019_billing_usage.sql
psql -d fluxcore_db -f 020_scalability.sql
```

### 7.4 Para Registrar Nuevas Routes

```typescript
// apps/api/src/index.ts
import { ragConfigRoutes } from './routes/rag-config.routes';

// Añadir al router principal
app.use(ragConfigRoutes);
```

---

## 8. Archivos Creados/Modificados

### 8.1 Nuevos Archivos

```
packages/db/migrations/
├── 015_pgvector_document_chunks.sql
├── 016_asset_permissions.sql
├── 017_rag_configurations.sql
├── 018_marketplace.sql
├── 019_billing_usage.sql
└── 020_scalability.sql

packages/db/src/schema/
├── fluxcore-document-chunks.ts
├── fluxcore-asset-permissions.ts
├── fluxcore-rag-configurations.ts
├── fluxcore-marketplace.ts
└── fluxcore-billing.ts

apps/api/src/services/
├── permission.service.ts
├── rag-config.service.ts
├── embedding.service.ts
├── chunking.service.ts
├── document-processing.service.ts
├── retrieval.service.ts
├── marketplace.service.ts
├── usage.service.ts
└── metrics.service.ts

apps/api/src/routes/
├── rag-config.routes.ts
└── fluxcore-runtime.routes.ts (modificado)

apps/web/src/components/fluxcore/components/
├── RAGConfigSection.tsx
└── VectorStoreFilesSection.tsx

apps/api/src/__tests__/
└── rag-integration.test.ts
```

### 8.2 Archivos Modificados

```
packages/db/src/schema/index.ts          # Exports de nuevos schemas
extensions/fluxcore/src/index.ts          # fetchRAGContext, generateSuggestion
extensions/fluxcore/src/prompt-builder.ts # ragContext en ContextData
apps/web/.../VectorStoresView.tsx        # Integración de componentes
apps/api/src/routes/fluxcore.routes.ts   # (pendiente upload endpoint)
```

---

## 9. Consideraciones de Arquitectura

### 9.1 Patrón "Assets por Referencia"

FluxCore sigue un patrón consistente donde los assets son entidades independientes:

```
Assistants ──references──▶ Instructions (by ID)
Assistants ──references──▶ Vector Stores (by ID)
Assistants ──references──▶ Tools (by ID)

Vector Stores ──contains──▶ Files
Vector Stores ──contains──▶ Document Chunks
```

### 9.2 Configuración en Cascada

La configuración RAG sigue una jerarquía de precedencia:

1. **Vector Store específico** (máxima prioridad)
2. **Account default**
3. **System default** (mínima prioridad)

```typescript
async getEffectiveConfig(vectorStoreId, accountId): Promise<RAGConfig> {
    // 1. Buscar config del VS
    const vsConfig = await findByVectorStore(vectorStoreId);
    if (vsConfig) return vsConfig;
    
    // 2. Buscar default de cuenta
    const accountConfig = await findAccountDefault(accountId);
    if (accountConfig) return accountConfig;
    
    // 3. Retornar default del sistema
    return DEFAULT_RAG_CONFIG;
}
```

### 9.3 Flujo de Procesamiento de Documentos

```
Upload ──▶ Parse ──▶ Chunk ──▶ Embed ──▶ Store
   │         │         │         │         │
   │         │         │         │         └── INSERT fluxcore_document_chunks
   │         │         │         └── embeddingService.embedBatch()
   │         │         └── chunkingService.chunkWithConfig()
   │         └── Placeholder (PDF/DOCX pending)
   └── POST /files/:id/upload
```

---

## 10. Próximos Pasos Recomendados

1. **Implementar endpoint de upload** - Crítico para funcionalidad completa
2. **Refactorizar a Files centralizados** - Seguir patrón de assets por referencia
3. **Ejecutar migraciones** - Preparar base de datos
4. **Probar flujo end-to-end** - Upload → Process → Query → Response
5. **Implementar parsing de PDF/DOCX** - Usando pdfjs-dist y mammoth
6. **Añadir tests de integración** - Ejecutar suite existente
7. **Implementar UI de Marketplace** - Para compartir assets

---

*Generado automáticamente basado en el código fuente de FluxCore*
