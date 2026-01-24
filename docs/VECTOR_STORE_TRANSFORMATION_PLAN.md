# Plan de Transformación: Vector Store OpenAI
## Alineación FluxCore con API Oficial de OpenAI

> **Fecha:** 2026-01-23
> **Estado:** Planificación
> **Prioridad:** Alta
> **Duración estimada:** 3-4 días de desarrollo

---

## ⚠️ CONFORMIDAD CON REGLAS ARQUITECTÓNICAS

Este plan **CUMPLE** con el documento normativo `ARCHITECTURE_RULES_VECTOR_STORES.md`.

### Principios Respetados:

| Regla | Cumplimiento | Notas |
|-------|--------------|-------|
| **Regla 1** (Separación de mundos) | ✅ | vs.openai y vs.fluxcore permanecen completamente separados |
| **Regla 2.1** (vs.openai es fuente de verdad) | ✅ | Todos los estados se leen desde OpenAI, no se infieren |
| **Regla 3.1** (DB local es registro referencial) | ✅ | FluxCore solo almacena referencias derivadas, no fuente de verdad |
| **Regla 4.1** (OpenAI primero) | ✅ | Toda mutación se ejecuta primero en OpenAI |
| **Regla 5.1** (vs.openai gana) | ✅ | Ante discrepancias, FluxCore se corrige desde OpenAI |
| **Regla 6.1** (Search no reemplaza Assistant) | ✅ | Búsqueda directa solo para QA/debugging/testing |

### Acciones Prohibidas (NO implementadas):

- ❌ Sincronización bidireccional
- ❌ Estados optimistas o asumidos
- ❌ Borrado solo local
- ❌ Creación de asociaciones sin openai_file_id

---

## Índice

1. [Objetivos](#1-objetivos)
2. [Arquitectura Propuesta](#2-arquitectura-propuesta)
3. [Plan por Fases](#3-plan-por-fases)
4. [Hitos y Entregables](#4-hitos-y-entregables)
5. [Código de Referencia](#5-código-de-referencia)
6. [Validación y Testing](#6-validación-y-testing)
7. [Rollback](#7-rollback)

---

## 1. Objetivos

### 1.1 Objetivo Principal
Alinear completamente la implementación de Vector Store OpenAI en FluxCore con la API oficial de OpenAI, habilitando todas las features nativas.

### 1.2 Objetivos Específicos

| ID | Objetivo | Prioridad | Gap que resuelve |
|----|----------|-----------|------------------|
| O1 | Implementar búsqueda semántica VS OpenAI **(solo QA/debugging/testing)** | Crítico | G1 |
| O2 | Leer file_counts desde OpenAI (fuente de verdad) | Crítico | G2 |
| O3 | Exponer chunking_strategy en API | Alto | G3 |
| O4 | Implementar atributos de archivo | Alto | G4 |
| O5 | Implementar file batches | Medio | G5 |
| O6 | Soportar metadata en vector stores | Medio | G6 |
| O7 | Alinear expires_after con OpenAI | Medio | G7 |

> ⚠️ **NOTA IMPORTANTE (Regla 6.1):** La búsqueda directa `vectorStores.search()` en vs.openai:
> - **NO reemplaza** al Assistant de OpenAI
> - **NO duplica lógica** del runtime de Assistants
> - Su propósito es exclusivamente: **QA, debugging, testing de embeddings, y habilitar modelos no-OpenAI**

### 1.3 Criterios de Éxito

- [ ] Búsqueda directa en VS OpenAI funcional (para QA/debugging)
- [ ] Estados de archivos leídos desde OpenAI, no inferidos
- [ ] Chunking configurable por archivo
- [ ] Atributos y filtros funcionando
- [ ] Tests automatizados pasando
- [ ] Sin regresiones en flujo local (vs.fluxcore independiente)

---

## 2. Arquitectura Propuesta

### 2.1 Diagrama de Flujo Objetivo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  OpenAIVectorStoresView.tsx                                             │
│    ├── Crear VS con metadata y expires_after                            │
│    ├── Subir archivos con chunking_strategy y attributes                │
│    ├── Ver file_counts sincronizado                                     │
│    └── Buscar con VS.search() y filtros                                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API (Elysia)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  fluxcore.routes.ts                                                      │
│    POST /vector-stores                 → createOpenAIVectorStore()      │
│    POST /vector-stores/:id/files       → addFileToOpenAIVectorStore()   │
│    POST /vector-stores/:id/search      → searchOpenAIVectorStore() 🆕   │
│    POST /vector-stores/:id/file-batches → createOpenAIFileBatch() 🆕    │
│    GET  /vector-stores/:id             → getOpenAIVectorStoreSync() 🆕  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    openai-sync.service.ts                                │
├─────────────────────────────────────────────────────────────────────────┤
│  🆕 Nuevas funciones:                                                    │
│    - searchOpenAIVectorStore(vsId, query, options)                      │
│    - syncVectorStoreFromOpenAI(vsId) → actualiza file_counts            │
│    - createOpenAIFileBatch(vsId, files)                                 │
│    - updateOpenAIVectorStoreFile(vsId, fileId, attributes)              │
│                                                                          │
│  🔄 Funciones mejoradas:                                                 │
│    - createOpenAIVectorStore() + metadata, expires_after                │
│    - addFileToOpenAIVectorStore() + chunking_strategy, attributes       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          OpenAI SDK                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  openai.vectorStores.create()                                            │
│  openai.vectorStores.search()                   🆕                       │
│  openai.vectorStores.files.create()             ⬆️ Mejorado             │
│  openai.vectorStores.fileBatches.create()       🆕                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Cambios en Base de Datos

```sql
-- Migración: 022_vector_store_openai_alignment.sql

-- 1. Agregar metadata a vector stores
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- 2. Agregar file_counts detallado
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS file_counts JSONB DEFAULT '{
    "in_progress": 0,
    "completed": 0,
    "failed": 0,
    "cancelled": 0,
    "total": 0
  }';

-- 3. Agregar atributos y chunking a archivos
ALTER TABLE fluxcore_vector_store_files
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chunking_strategy JSONB;

-- 4. Normalizar expires_after
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS expires_after JSONB;
-- Ejemplo: {"anchor": "last_active_at", "days": 7}

-- 5. Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_vs_files_attributes 
  ON fluxcore_vector_store_files USING GIN (attributes);
```

---

## 3. Plan por Fases

### FASE 1: Fundamentos (Día 1)
**Objetivo:** Preparar la base de datos y servicios

#### 1.1 Migración de Base de Datos
```sql
-- Archivo: packages/db/migrations/022_vector_store_openai_alignment.sql
```

#### 1.2 Actualizar Schemas Drizzle
```typescript
// packages/db/src/schema/fluxcore-vector-stores.ts

export const fluxcoreVectorStores = pgTable('fluxcore_vector_stores', {
  // ... campos existentes ...
  
  // 🆕 Nuevos campos
  metadata: jsonb('metadata').$type<Record<string, string>>().default({}),
  lastActiveAt: timestamp('last_active_at'),
  fileCounts: jsonb('file_counts').$type<{
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  }>().default({
    in_progress: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    total: 0,
  }),
  expiresAfter: jsonb('expires_after').$type<{
    anchor: 'last_active_at';
    days: number;
  } | null>(),
});

export const fluxcoreVectorStoreFiles = pgTable('fluxcore_vector_store_files', {
  // ... campos existentes ...
  
  // 🆕 Nuevos campos
  attributes: jsonb('attributes').$type<Record<string, string | number | boolean>>().default({}),
  chunkingStrategy: jsonb('chunking_strategy').$type<{
    type: 'auto' | 'static';
    static?: {
      max_chunk_size_tokens: number;
      chunk_overlap_tokens: number;
    };
  }>(),
});
```

#### 1.3 Generar Migración Drizzle
```bash
cd packages/db
npx drizzle-kit generate
```

### FASE 2: Servicios Core (Día 1-2)
**Objetivo:** Implementar funciones de sincronización

#### 2.1 Mejorar openai-sync.service.ts

```typescript
// apps/api/src/services/openai-sync.service.ts

// ════════════════════════════════════════════════════════════════════════════
// INTERFACES MEJORADAS
// ════════════════════════════════════════════════════════════════════════════

export interface CreateOpenAIVectorStoreParams {
  name: string;
  description?: string;
  fileIds?: string[];
  chunkingStrategy?: ChunkingStrategy;
  expiresAfter?: { anchor: 'last_active_at'; days: number };
  metadata?: Record<string, string>;
}

export interface ChunkingStrategy {
  type: 'auto' | 'static';
  static?: {
    max_chunk_size_tokens: number;  // 100-4096
    chunk_overlap_tokens: number;    // <= max/2
  };
}

export interface AddFileToVectorStoreParams {
  vectorStoreId: string;
  fileId: string;
  chunkingStrategy?: ChunkingStrategy;
  attributes?: Record<string, string | number | boolean>;
}

export interface VectorStoreSearchParams {
  query: string | string[];
  maxNumResults?: number;  // 1-50, default 10
  rewriteQuery?: boolean;
  rankingOptions?: {
    ranker?: 'none' | 'auto' | 'default-2024-11-15';
    scoreThreshold?: number;
  };
  filters?: SearchFilter;
}

export type SearchFilter = 
  | { type: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'; key: string; value: string | number }
  | { type: 'and' | 'or'; filters: SearchFilter[] };

export interface VectorStoreSearchResult {
  fileId: string;
  filename: string;
  score: number;
  attributes: Record<string, string | number | boolean>;
  content: Array<{ type: 'text'; text: string }>;
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES NUEVAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Buscar en un Vector Store de OpenAI
 */
export async function searchOpenAIVectorStore(
  vectorStoreId: string,
  params: VectorStoreSearchParams
): Promise<VectorStoreSearchResult[]> {
  const client = getOpenAIClient();
  const vectorStores = getVectorStoresApi(client);
  
  if (!vectorStores?.search) {
    throw new Error('OpenAI SDK: vectorStores.search no disponible');
  }

  const response = await vectorStores.search(vectorStoreId, {
    query: params.query,
    max_num_results: params.maxNumResults ?? 10,
    rewrite_query: params.rewriteQuery ?? false,
    ranking_options: params.rankingOptions ? {
      ranker: params.rankingOptions.ranker,
      score_threshold: params.rankingOptions.scoreThreshold,
    } : undefined,
    filters: params.filters,
  });

  const results: VectorStoreSearchResult[] = [];
  for await (const result of response) {
    results.push({
      fileId: result.file_id,
      filename: result.filename,
      score: result.score,
      attributes: result.attributes || {},
      content: result.content,
    });
  }

  return results;
}

/**
 * Sincronizar estado de Vector Store desde OpenAI
 */
export async function syncVectorStoreFromOpenAI(externalId: string): Promise<{
  status: string;
  usageBytes: number;
  fileCounts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  lastActiveAt: number | null;
}> {
  const client = getOpenAIClient();
  const vectorStores = getVectorStoresApi(client);
  
  if (!vectorStores?.retrieve) {
    throw new Error('OpenAI SDK: vectorStores.retrieve no disponible');
  }

  const vs = await vectorStores.retrieve(externalId);
  
  return {
    status: vs.status,
    usageBytes: vs.usage_bytes,
    fileCounts: vs.file_counts,
    lastActiveAt: vs.last_active_at,
  };
}

/**
 * Crear batch de archivos
 */
export async function createOpenAIFileBatch(
  vectorStoreId: string,
  files: Array<{
    file_id: string;
    attributes?: Record<string, string | number | boolean>;
    chunking_strategy?: ChunkingStrategy;
  }>
): Promise<string> {
  const client = getOpenAIClient();
  const vectorStores = getVectorStoresApi(client);
  
  if (!vectorStores?.fileBatches?.create) {
    throw new Error('OpenAI SDK: vectorStores.fileBatches.create no disponible');
  }

  const batch = await vectorStores.fileBatches.create(vectorStoreId, {
    files: files.map(f => ({
      file_id: f.file_id,
      attributes: f.attributes,
      chunking_strategy: f.chunking_strategy,
    })),
  });

  return batch.id;
}

/**
 * Listar archivos de un Vector Store con paginación
 */
export async function listOpenAIVectorStoreFiles(
  vectorStoreId: string,
  options?: {
    limit?: number;
    after?: string;
    filter?: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  }
): Promise<{
  files: Array<{
    id: string;
    status: string;
    usageBytes: number;
    attributes: Record<string, any>;
    chunkingStrategy: any;
  }>;
  hasMore: boolean;
  lastId?: string;
}> {
  const client = getOpenAIClient();
  const vectorStores = getVectorStoresApi(client);
  
  const response = await vectorStores.files.list(vectorStoreId, {
    limit: options?.limit ?? 20,
    after: options?.after,
    filter: options?.filter,
  });

  const files = [];
  for await (const file of response) {
    files.push({
      id: file.id,
      status: file.status,
      usageBytes: file.usage_bytes || 0,
      attributes: file.attributes || {},
      chunkingStrategy: file.chunking_strategy,
    });
  }

  return {
    files,
    hasMore: response.hasMore ?? false,
    lastId: files[files.length - 1]?.id,
  };
}
```

#### 2.2 Mejorar funciones existentes

```typescript
// apps/api/src/services/openai-sync.service.ts

/**
 * Crea un vector store en OpenAI (MEJORADO)
 */
export async function createOpenAIVectorStore(
  params: CreateOpenAIVectorStoreParams
): Promise<{ id: string; externalData: any }> {
  const client = getOpenAIClient();
  const vectorStores = getVectorStoresApi(client);

  const payload: any = {
    name: params.name,
  };
  
  // 🆕 Descripción
  if (params.description) {
    payload.description = params.description;
  }
  
  // 🆕 Archivos iniciales
  if (params.fileIds && params.fileIds.length > 0) {
    payload.file_ids = params.fileIds;
  }
  
  // 🆕 Estrategia de chunking
  if (params.chunkingStrategy) {
    payload.chunking_strategy = params.chunkingStrategy;
  }
  
  // 🆕 Política de expiración
  if (params.expiresAfter) {
    payload.expires_after = params.expiresAfter;
  }
  
  // 🆕 Metadata
  if (params.metadata) {
    payload.metadata = params.metadata;
  }

  const vectorStore = await vectorStores.create(payload);
  
  return {
    id: vectorStore.id,
    externalData: {
      status: vectorStore.status,
      fileCounts: vectorStore.file_counts,
      usageBytes: vectorStore.usage_bytes,
      createdAt: vectorStore.created_at,
    }
  };
}

/**
 * Agrega un archivo a un vector store en OpenAI (MEJORADO)
 */
export async function addFileToOpenAIVectorStore(
  params: AddFileToVectorStoreParams
): Promise<{ id: string; status: string }> {
  const client = getOpenAIClient();
  const vectorStores = getVectorStoresApi(client);

  const payload: any = {
    file_id: params.fileId,
  };
  
  // 🆕 Estrategia de chunking
  if (params.chunkingStrategy) {
    payload.chunking_strategy = params.chunkingStrategy;
  }
  
  // 🆕 Atributos
  if (params.attributes) {
    payload.attributes = params.attributes;
  }

  const file = await vectorStores.files.create(params.vectorStoreId, payload);

  return {
    id: file.id,
    status: file.status,
  };
}
```

### FASE 3: API Endpoints (Día 2)
**Objetivo:** Exponer nuevas funcionalidades

#### 3.1 Nuevo endpoint de búsqueda

```typescript
// apps/api/src/routes/fluxcore.routes.ts

// POST /fluxcore/vector-stores/:id/search
.post(
  '/:id/search',
  async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    const { accountId, query, maxNumResults, filters, rankingOptions } = body;

    try {
      const store = await fluxcoreService.getVectorStoreById(params.id, accountId);
      if (!store) {
        set.status = 404;
        return { success: false, message: 'Vector store not found' };
      }

      // Solo para OpenAI Vector Stores
      if (store.backend !== 'openai' || !store.externalId) {
        set.status = 400;
        return { 
          success: false, 
          message: 'Search is only available for OpenAI vector stores' 
        };
      }

      const { searchOpenAIVectorStore } = await import(
        '../services/openai-sync.service'
      );

      const results = await searchOpenAIVectorStore(store.externalId, {
        query,
        maxNumResults: maxNumResults ?? 10,
        rankingOptions: {
          ranker: rankingOptions?.ranker ?? 'auto',
          scoreThreshold: rankingOptions?.scoreThreshold ?? 0.0,
        },
        filters,
      });

      return { 
        success: true, 
        data: {
          results,
          query,
          totalResults: results.length,
        }
      };
    } catch (error: any) {
      console.error('[fluxcore] Error searching vector store:', error);
      set.status = 500;
      return { success: false, message: error.message };
    }
  },
  {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      accountId: t.String(),
      query: t.Union([t.String(), t.Array(t.String())]),
      maxNumResults: t.Optional(t.Number()),
      rankingOptions: t.Optional(t.Object({
        ranker: t.Optional(t.String()),
        scoreThreshold: t.Optional(t.Number()),
      })),
      filters: t.Optional(t.Any()),
    }),
    detail: {
      tags: ['FluxCore'],
      summary: 'Search OpenAI vector store semantically',
    },
  }
)
```

#### 3.2 Mejorar GET /vector-stores/:id con sincronización

```typescript
// apps/api/src/routes/fluxcore.routes.ts

// GET /fluxcore/vector-stores/:id (MEJORADO)
.get(
  '/:id',
  async ({ user, params, query, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    const accountId = query.accountId;
    const sync = query.sync === 'true'; // 🆕 Forzar sincronización

    try {
      const store = await fluxcoreService.getVectorStoreById(params.id, accountId);
      if (!store) {
        set.status = 404;
        return { success: false, message: 'Vector store not found' };
      }

      // 🆕 Sincronizar con OpenAI si es necesario
      if (store.backend === 'openai' && store.externalId && sync) {
        const { syncVectorStoreFromOpenAI } = await import(
          '../services/openai-sync.service'
        );
        
        try {
          const remoteData = await syncVectorStoreFromOpenAI(store.externalId);
          
          // Actualizar datos locales
          await fluxcoreService.updateVectorStoreSync(params.id, accountId, {
            status: remoteData.status === 'completed' ? 'production' : 'draft',
            fileCounts: remoteData.fileCounts,
            sizeBytes: remoteData.usageBytes,
            lastActiveAt: remoteData.lastActiveAt 
              ? new Date(remoteData.lastActiveAt * 1000) 
              : null,
          });
          
          // Recargar con datos actualizados
          const updated = await fluxcoreService.getVectorStoreById(params.id, accountId);
          return { success: true, data: updated };
        } catch (syncError) {
          console.warn('[fluxcore] Could not sync with OpenAI:', syncError);
          // Continuar con datos locales
        }
      }

      return { success: true, data: store };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  },
  {
    params: t.Object({
      id: t.String(),
    }),
    query: t.Object({
      accountId: t.String(),
      sync: t.Optional(t.String()), // 🆕
    }),
    detail: {
      tags: ['FluxCore'],
      summary: 'Get vector store by ID with optional OpenAI sync',
    },
  }
)
```

#### 3.3 Mejorar POST /vector-stores/:id/files/upload

```typescript
// apps/api/src/routes/fluxcore.routes.ts

// POST /fluxcore/vector-stores/:id/files/upload (MEJORADO)
.post(
  '/:id/files/upload',
  async ({ user, params, body, set }) => {
    // ... autenticación existente ...

    try {
      const { 
        file, 
        accountId, 
        chunkingStrategy,  // 🆕
        attributes         // 🆕
      } = body as { 
        file: File; 
        accountId: string;
        chunkingStrategy?: ChunkingStrategy;
        attributes?: Record<string, string | number | boolean>;
      };

      const store = await fluxcoreService.getVectorStoreById(params.id, accountId);
      if (!store) {
        set.status = 404;
        return { success: false, message: 'Vector store not found' };
      }

      const arrayBuffer = await file.arrayBuffer();
      const content = Buffer.from(arrayBuffer);

      if (store.backend === 'openai') {
        if (!store.externalId) {
          set.status = 400;
          return { success: false, message: 'OpenAI vector store is missing externalId' };
        }

        const { 
          uploadOpenAIFile, 
          addFileToOpenAIVectorStore 
        } = await import('../services/openai-sync.service');
        
        // 1. Subir archivo a OpenAI Files API
        const openaiFileId = await uploadOpenAIFile(content, file.name);
        
        // 2. Asociar archivo al vector store con opciones 🆕
        const fileResult = await addFileToOpenAIVectorStore({
          vectorStoreId: store.externalId as string,
          fileId: openaiFileId,
          chunkingStrategy,
          attributes,
        });
        
        // 3. Crear referencia local con nuevos campos
        const fileLink = await fluxcoreService.addVectorStoreFile({
          vectorStoreId: params.id,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          status: 'processing',
          externalId: openaiFileId,
          chunkingStrategy,   // 🆕
          attributes,         // 🆕
        });

        return {
          success: true,
          data: {
            linkId: fileLink.id,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            status: 'processing',
            externalId: openaiFileId,
            chunkingStrategy,
            attributes,
          }
        };
      }

      // ... flujo local existente ...
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  },
  // ... schema actualizado ...
)
```

### FASE 4: Frontend (Día 3)
**Objetivo:** Actualizar UI para exponer nuevas features

#### 4.1 Actualizar tipos

```typescript
// apps/web/src/types/fluxcore.ts

export interface OpenAIVectorStore {
  id: string;
  name: string;
  description: string | null;
  externalId: string | null;
  status: string;
  backend: 'openai';
  
  // 🆕 Nuevos campos
  fileCounts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  usageBytes: number;
  metadata: Record<string, string>;
  expiresAfter?: {
    anchor: 'last_active_at';
    days: number;
  };
  lastActiveAt: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface OpenAIFile {
  id: string;
  name: string;
  sizeBytes: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  externalId: string | null;
  
  // 🆕 Nuevos campos
  attributes: Record<string, string | number | boolean>;
  chunkingStrategy?: {
    type: 'auto' | 'static';
    static?: {
      max_chunk_size_tokens: number;
      chunk_overlap_tokens: number;
    };
  };
  
  createdAt: string;
}

export interface VectorStoreSearchResult {
  fileId: string;
  filename: string;
  score: number;
  attributes: Record<string, string | number | boolean>;
  content: Array<{ type: 'text'; text: string }>;
}
```

#### 4.2 Componente de búsqueda

```tsx
// apps/web/src/components/fluxcore/components/VectorStoreSearch.tsx

import { useState } from 'react';
import { Search, Loader2, FileText } from 'lucide-react';
import type { VectorStoreSearchResult } from '../../../types/fluxcore';

interface VectorStoreSearchProps {
  vectorStoreId: string;
  accountId: string;
  onSearch: (results: VectorStoreSearchResult[]) => void;
}

export function VectorStoreSearch({ 
  vectorStoreId, 
  accountId, 
  onSearch 
}: VectorStoreSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VectorStoreSearchResult[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/fluxcore/vector-stores/${vectorStoreId}/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            query,
            maxNumResults: 10,
            rankingOptions: {
              ranker: 'auto',
              scoreThreshold: 0.5,
            },
          }),
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setResults(data.data.results);
        onSearch(data.data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en el Vector Store..."
          className="flex-1 px-3 py-2 bg-elevated border border-subtle rounded-lg"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-accent text-white rounded-lg disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Resultados ({results.length})
          </h4>
          {results.map((result, idx) => (
            <div key={idx} className="p-3 bg-elevated rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-muted" />
                  <span className="text-sm font-medium">
                    {result.filename}
                  </span>
                </div>
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                  {(result.score * 100).toFixed(0)}% relevancia
                </span>
              </div>
              {result.content.map((c, i) => (
                <p key={i} className="text-xs text-muted line-clamp-3">
                  {c.text}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Hitos y Entregables

### Hito 1: Base de Datos y Schemas (0.5 días)
- [ ] Crear migración SQL `022_vector_store_openai_alignment.sql`
- [ ] Actualizar schemas Drizzle
- [ ] Generar y aplicar migración
- [ ] Verificar integridad de datos existentes

**Entregable:** Base de datos actualizada con nuevos campos

### Hito 2: Servicios Backend (1 día)
- [ ] Implementar `searchOpenAIVectorStore()`
- [ ] Implementar `syncVectorStoreFromOpenAI()`
- [ ] Implementar `createOpenAIFileBatch()`
- [ ] Mejorar `createOpenAIVectorStore()` con metadata/expires
- [ ] Mejorar `addFileToOpenAIVectorStore()` con chunking/attributes
- [ ] Tests unitarios de servicios

**Entregable:** Servicios funcionando con tests

### Hito 3: API Endpoints (0.5 días)
- [ ] Endpoint `POST /vector-stores/:id/search`
- [ ] Mejorar `GET /vector-stores/:id` con sync
- [ ] Mejorar `POST /vector-stores/:id/files/upload`
- [ ] Endpoint `POST /vector-stores/:id/file-batches`
- [ ] Documentación OpenAPI actualizada

**Entregable:** API lista para consumir

### Hito 4: Frontend (1 día)
- [ ] Actualizar tipos TypeScript
- [ ] Componente `VectorStoreSearch`
- [ ] Mostrar `file_counts` en UI
- [ ] Formulario de chunking strategy
- [ ] Formulario de attributes
- [ ] Indicadores de estado sincronizado

**Entregable:** UI completa con nuevas features

### Hito 5: Testing e Integración (0.5 días)
- [ ] Tests E2E de flujo completo
- [ ] Verificar no regresión en flujo local
- [ ] Performance benchmark
- [ ] Documentación actualizada

**Entregable:** Sistema probado y documentado

---

## 5. Código de Referencia

### 5.1 Script de Migración Completo

```sql
-- packages/db/migrations/022_vector_store_openai_alignment.sql

-- ════════════════════════════════════════════════════════════════════════════
-- Migración: Alineación Vector Store con OpenAI API
-- Fecha: 2026-01-23
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Agregar metadata a vector stores (hasta 16 pares clave-valor)
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Agregar tracking de last_active_at
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- 3. Agregar file_counts detallado (reemplaza fileCount simple)
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS file_counts JSONB DEFAULT '{
    "in_progress": 0,
    "completed": 0,
    "failed": 0,
    "cancelled": 0,
    "total": 0
  }';

-- 4. Migrar datos de fileCount existente a file_counts
UPDATE fluxcore_vector_stores
SET file_counts = jsonb_build_object(
  'in_progress', 0,
  'completed', COALESCE(file_count, 0),
  'failed', 0,
  'cancelled', 0,
  'total', COALESCE(file_count, 0)
)
WHERE file_counts IS NULL OR file_counts = '{}';

-- 5. Normalizar expires_after según formato OpenAI
ALTER TABLE fluxcore_vector_stores
  ADD COLUMN IF NOT EXISTS expires_after JSONB;

-- Migrar datos de expirationPolicy/expirationDays existentes
UPDATE fluxcore_vector_stores
SET expires_after = CASE 
  WHEN expiration_policy = 'days_after_last_use' THEN 
    jsonb_build_object('anchor', 'last_active_at', 'days', COALESCE(expiration_days, 7))
  ELSE NULL
END
WHERE expires_after IS NULL 
  AND expiration_policy IS NOT NULL 
  AND expiration_policy != 'never';

-- 6. Agregar atributos a archivos (hasta 16 pares clave-valor)
ALTER TABLE fluxcore_vector_store_files
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';

-- 7. Agregar chunking_strategy por archivo
ALTER TABLE fluxcore_vector_store_files
  ADD COLUMN IF NOT EXISTS chunking_strategy JSONB;

-- 8. Agregar usage_bytes por archivo
ALTER TABLE fluxcore_vector_store_files
  ADD COLUMN IF NOT EXISTS usage_bytes INTEGER DEFAULT 0;

-- 9. Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_vs_metadata 
  ON fluxcore_vector_stores USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_vs_files_attributes 
  ON fluxcore_vector_store_files USING GIN (attributes);

CREATE INDEX IF NOT EXISTS idx_vs_backend 
  ON fluxcore_vector_stores (backend);

CREATE INDEX IF NOT EXISTS idx_vs_external_id 
  ON fluxcore_vector_stores (external_id) 
  WHERE external_id IS NOT NULL;

-- 10. Comentarios de documentación
COMMENT ON COLUMN fluxcore_vector_stores.metadata IS 
  'OpenAI-compatible metadata: up to 16 key-value pairs (key max 64 chars, value max 512 chars)';

COMMENT ON COLUMN fluxcore_vector_stores.file_counts IS 
  'OpenAI-compatible file counts: {in_progress, completed, failed, cancelled, total}';

COMMENT ON COLUMN fluxcore_vector_stores.expires_after IS 
  'OpenAI-compatible expiration policy: {anchor: "last_active_at", days: number}';

COMMENT ON COLUMN fluxcore_vector_store_files.attributes IS 
  'OpenAI-compatible file attributes for filtering in search';

COMMENT ON COLUMN fluxcore_vector_store_files.chunking_strategy IS 
  'OpenAI chunking config: {type: "auto"|"static", static?: {max_chunk_size_tokens, chunk_overlap_tokens}}';

COMMIT;
```

### 5.2 Test de Integración

```typescript
// apps/api/src/tests/openai-vector-store.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { 
  createOpenAIVectorStore,
  searchOpenAIVectorStore,
  syncVectorStoreFromOpenAI,
  deleteOpenAIVectorStore,
  uploadOpenAIFile,
  addFileToOpenAIVectorStore,
} from '../services/openai-sync.service';

describe('OpenAI Vector Store Integration', () => {
  let vectorStoreId: string;
  let fileId: string;

  beforeAll(async () => {
    // Crear vector store de prueba
    const result = await createOpenAIVectorStore({
      name: 'Test Vector Store',
      description: 'Created by integration test',
      metadata: { test: 'true', environment: 'integration' },
      expiresAfter: { anchor: 'last_active_at', days: 1 },
    });
    vectorStoreId = result.id;
    
    // Subir archivo de prueba
    const testContent = Buffer.from('This is a test document for vector search.');
    fileId = await uploadOpenAIFile(testContent, 'test-doc.txt');
    
    // Agregar archivo al vector store
    await addFileToOpenAIVectorStore({
      vectorStoreId,
      fileId,
      chunkingStrategy: { type: 'auto' },
      attributes: { category: 'test', priority: 1 },
    });
    
    // Esperar procesamiento
    await new Promise(r => setTimeout(r, 5000));
  });

  afterAll(async () => {
    if (vectorStoreId) {
      await deleteOpenAIVectorStore(vectorStoreId);
    }
  });

  it('should sync vector store from OpenAI', async () => {
    const data = await syncVectorStoreFromOpenAI(vectorStoreId);
    
    expect(data.status).toBeDefined();
    expect(data.fileCounts.total).toBeGreaterThanOrEqual(1);
  });

  it('should search vector store with query', async () => {
    const results = await searchOpenAIVectorStore(vectorStoreId, {
      query: 'test document',
      maxNumResults: 5,
      rankingOptions: {
        ranker: 'auto',
        scoreThreshold: 0.5,
      },
    });

    expect(results).toBeArray();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].content).toBeArray();
  });

  it('should filter by attributes', async () => {
    const results = await searchOpenAIVectorStore(vectorStoreId, {
      query: 'test',
      filters: {
        type: 'eq',
        key: 'category',
        value: 'test',
      },
    });

    expect(results.every(r => r.attributes.category === 'test')).toBe(true);
  });
});
```

---

## 6. Validación y Testing

### 6.1 Checklist de Validación

**Base de Datos:**
- [ ] Migración aplicada sin errores
- [ ] Datos existentes migrados correctamente
- [ ] Índices creados
- [ ] Constraints respetados

**Backend:**
- [ ] `createOpenAIVectorStore` crea con todos los parámetros
- [ ] `searchOpenAIVectorStore` retorna resultados
- [ ] `syncVectorStoreFromOpenAI` actualiza file_counts
- [ ] Error handling correcto

**API:**
- [ ] Endpoint de búsqueda responde 200
- [ ] Sync actualiza datos locales
- [ ] Upload con chunking/attributes funciona
- [ ] Validación de inputs correcta

**Frontend:**
- [ ] Componente de búsqueda renderiza
- [ ] file_counts se muestra actualizado
- [ ] Formularios funcionan
- [ ] No hay regresiones visuales

### 6.2 Tests Manuales

```markdown
## Test Manual: Búsqueda en Vector Store OpenAI

1. Crear vector store con backend=openai
2. Subir 2-3 archivos PDF/TXT
3. Esperar status=completed
4. Buscar "término específico"
5. Verificar resultados con scores
6. Filtrar por atributos
7. Verificar que file_counts muestra números correctos
```

---

## 7. Rollback

### 7.1 Script de Rollback

```sql
-- packages/db/migrations/022_vector_store_openai_alignment_rollback.sql

BEGIN;

-- Revertir columnas agregadas
ALTER TABLE fluxcore_vector_stores
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS last_active_at,
  DROP COLUMN IF EXISTS file_counts,
  DROP COLUMN IF EXISTS expires_after;

ALTER TABLE fluxcore_vector_store_files
  DROP COLUMN IF EXISTS attributes,
  DROP COLUMN IF EXISTS chunking_strategy,
  DROP COLUMN IF EXISTS usage_bytes;

-- Eliminar índices
DROP INDEX IF EXISTS idx_vs_metadata;
DROP INDEX IF EXISTS idx_vs_files_attributes;
DROP INDEX IF EXISTS idx_vs_backend;
DROP INDEX IF EXISTS idx_vs_external_id;

COMMIT;
```

### 7.2 Procedimiento de Rollback

1. Desplegar versión anterior del código
2. Ejecutar script de rollback SQL
3. Verificar integridad de datos
4. Reiniciar servicios

---

## Resumen de Archivos a Modificar/Crear

| Archivo | Acción | Prioridad |
|---------|--------|-----------|
| `packages/db/migrations/022_*.sql` | Crear | 🔴 Crítico |
| `packages/db/src/schema/fluxcore-vector-stores.ts` | Modificar | 🔴 Crítico |
| `apps/api/src/services/openai-sync.service.ts` | Modificar | 🔴 Crítico |
| `apps/api/src/routes/fluxcore.routes.ts` | Modificar | 🔴 Crítico |
| `apps/api/src/services/fluxcore.service.ts` | Modificar | 🟡 Alto |
| `apps/web/src/types/fluxcore.ts` | Crear/Modificar | 🟡 Alto |
| `apps/web/src/components/fluxcore/views/OpenAIVectorStoresView.tsx` | Modificar | 🟡 Alto |
| `apps/web/src/components/fluxcore/components/VectorStoreSearch.tsx` | Crear | 🟡 Alto |
| `apps/api/src/tests/openai-vector-store.test.ts` | Crear | 🟢 Medio |
| `docs/OPENAI_VECTOR_STORE_REFERENCE.md` | Crear | ✅ Completado |

---

*Plan creado: 2026-01-23*
*Próxima revisión: Tras completar Hito 1*
