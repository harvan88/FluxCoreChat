# Auditoría: Vector Store FluxCore vs OpenAI API

> **Fecha:** 2026-01-23
> **Auditor:** Antigravity AI
> **Versión FluxCore:** Actual
> **Versión OpenAI API:** v2 (assistants=v2)

---

## Resumen Ejecutivo

Esta auditoría compara la implementación actual del Vector Store en FluxCore con la API oficial de OpenAI para identificar gaps, desalineaciones y oportunidades de mejora.

### Estado General

| Categoría | Alineación | Prioridad |
|-----------|------------|-----------|
| Gestión de Vector Stores | 🟡 Parcial | Alta |
| Gestión de Archivos | 🟡 Parcial | Alta |
| Búsqueda Semántica | 🔴 Desalineado | Crítica |
| Chunking Strategy | 🔴 No implementado | Alta |
| File Batches | 🔴 No implementado | Media |
| Atributos de Archivos | 🔴 No implementado | Media |
| Políticas de Expiración | 🟢 Parcialmente alineado | Baja |

### ⚠️ Reglas Arquitectónicas Aplicables

Esta auditoría debe leerse en conjunto con el documento normativo **`ARCHITECTURE_RULES_VECTOR_STORES.md`**.

**Principios fundamentales:**

| Principio | Implicación para esta auditoría |
|-----------|--------------------------------|
| **Separación de mundos** | vs.openai y vs.fluxcore son sistemas distintos y NO equivalentes |
| **vs.openai es fuente de verdad** | Todos los estados deben leerse desde OpenAI, no inferirse |
| **DB local es registro referencial** | FluxCore NO decide ni corrige el estado de vs.openai |
| **OpenAI primero** | Toda mutación se ejecuta primero en OpenAI, luego se refleja |
| **Búsqueda para QA/debugging** | `vectorStores.search()` NO reemplaza al Assistant |

---

## 1. Análisis de Arquitectura Actual

### 1.1 Schema de Base de Datos FluxCore

**Tabla: `fluxcore_vector_stores`**
```typescript
{
  id: uuid
  accountId: uuid                     // ✓ Correcto - multitenancy
  name: varchar(255)                  // ✓ Alineado con OpenAI
  description: text                   // ✓ Alineado con OpenAI
  externalId: varchar(255)            // ✓ Para tracking de ID de OpenAI
  visibility: varchar(20)             // ⚠️ No existe en OpenAI (extensión local)
  status: varchar(20)                 // ⚠️ Parcialmente alineado
  backend: varchar(20)                // ✓ Discriminador local/openai
  expirationPolicy: varchar(50)       // ⚠️ Diferente estructura
  expirationDays: integer             // ⚠️ Diferente a OpenAI
  expiresAt: timestamp                // ✓ Alineado
  usage: jsonb                        // ⚠️ Diferente estructura
  sizeBytes: integer                  // ⚠️ OpenAI usa usage_bytes
  fileCount: integer                  // ⚠️ OpenAI usa file_counts object
}
```

**Brechas identificadas:**
1. ❌ **`file_counts`** - OpenAI tiene un objeto con `{in_progress, completed, failed, cancelled, total}`. FluxCore solo tiene `fileCount`.
2. ❌ **`metadata`** - OpenAI soporta hasta 16 pares clave-valor. FluxCore no lo implementa.
3. ❌ **`last_active_at`** - No se rastrea en FluxCore.
4. ⚠️ **`status`** - FluxCore usa `draft/production/expired`. OpenAI usa `in_progress/completed/expired`.

**Tabla: `fluxcore_vector_store_files`**
```typescript
{
  id: uuid
  vectorStoreId: uuid
  fileId: uuid                        // ⚠️ Referencia a archivo central (solo local)
  name: varchar(255)
  externalId: varchar(255)            // ✓ ID del archivo en OpenAI
  mimeType: varchar(100)
  sizeBytes: integer
  status: varchar(20)                 // ⚠️ Parcialmente alineado
  errorMessage: text                  // ⚠️ OpenAI usa last_error object
  chunkCount: integer                 // ⚠️ No existe en OpenAI
}
```

**Brechas identificadas:**
1. ❌ **`attributes`** - OpenAI soporta metadatos personalizados por archivo (16 pares).
2. ❌ **`chunking_strategy`** - OpenAI permite configuración por archivo.
3. ❌ **`usage_bytes`** - No se rastrea por archivo.
4. ⚠️ **`last_error`** - OpenAI usa objeto `{code, message}`.

### 1.2 Servicio de Sincronización (`openai-sync.service.ts`)

**Funciones implementadas:**
- ✅ `createOpenAIVectorStore` - Crea vector store
- ✅ `updateOpenAIVectorStore` - Actualiza nombre
- ✅ `deleteOpenAIVectorStore` - Elimina vector store
- ✅ `uploadOpenAIFile` - Sube archivo a Files API
- ✅ `addFileToOpenAIVectorStore` - Vincula archivo a VS
- ✅ `removeFileFromOpenAIVectorStore` - Desvincula archivo
- ✅ `getOpenAIVectorStoreFile` - Recupera estado del archivo

**Funciones FALTANTES:**
- ❌ `searchOpenAIVectorStore` - Búsqueda semántica directa
- ❌ `createOpenAIFileBatch` - Creación de batches
- ❌ `getOpenAIVectorStoreFiles` - Listar archivos con paginación
- ❌ `updateOpenAIVectorStoreFile` - Actualizar atributos
- ❌ `getOpenAIFileContent` - Obtener contenido parseado
- ❌ `listOpenAIVectorStores` - Listar con sincronización

### 1.3 Rutas API (`fluxcore.routes.ts`)

**Estado de alineación por endpoint:**

| Endpoint FluxCore | Endpoint OpenAI | Estado |
|-------------------|-----------------|--------|
| `GET /vector-stores` | `GET /v1/vector_stores` | 🟡 Parcial (sin paginación real) |
| `GET /vector-stores/:id` | `GET /v1/vector_stores/{id}` | ✅ Alineado |
| `POST /vector-stores` | `POST /v1/vector_stores` | 🟡 Faltan params |
| `PUT /vector-stores/:id` | `POST /v1/vector_stores/{id}` | 🟡 Faltan params |
| `DELETE /vector-stores/:id` | `DELETE /v1/vector_stores/{id}` | ✅ Alineado |
| `GET /vector-stores/:id/files` | `GET /v1/vector_stores/{id}/files` | 🟡 Sin filtros |
| `POST /vector-stores/:id/files/upload` | `POST /v1/files` + `POST /vs/{id}/files` | 🟡 Combinado |
| N/A | `POST /v1/vector_stores/{id}/search` | ❌ NO EXISTE |
| N/A | `POST /v1/vector_stores/{id}/file_batches` | ❌ NO EXISTE |

---

## 2. Análisis de Flujos

### 2.1 Flujo OpenAI (Actual en FluxCore)

```
[Usuario sube archivo]
       │
       ▼
[fluxcore.routes.ts: /vector-stores/:id/files/upload]
       │
       ├── if backend === 'openai':
       │      │
       │      ▼
       │   [openai-sync: uploadOpenAIFile]
       │      │
       │      ▼
       │   [openai-sync: addFileToOpenAIVectorStore]
       │      │
       │      ▼
       │   [fluxcoreService: addVectorStoreFile] <- Solo referencia local
       │      │
       │      ▼
       │   [Respuesta: status='processing']
       │
       └── PERO...
              │
              ▼
           [❌ NO hay polling de estado]
           [❌ NO se actualiza file_counts]
           [❌ NO se puede hacer búsqueda directa]
```

### 2.2 Flujo OpenAI (Esperado según API)

```
[Usuario sube archivo]
       │
       ▼
[1. POST /files con purpose='assistants']
       │
       ▼
[2. POST /vector_stores/{id}/files]
       │ con chunking_strategy y attributes
       ▼
[3. Polling status hasta 'completed']
       │
       ▼
[4. Actualizar file_counts en vector store]
       │
       ▼
[5. Listo para file_search o VS.search()]
```

### 2.3 Gap Crítico: Búsqueda Semántica OpenAI

**Situación actual:**
- FluxCore implementa RAG local con `retrieval.service.ts`
- Usa embeddings propios y pgvector para búsqueda
- **NO** usa la búsqueda nativa de OpenAI Vector Store

**Impacto:**
- Para vector stores OpenAI, la búsqueda debería usar `POST /vector_stores/{id}/search`
- Actualmente NO HAY forma de buscar en un vector store OpenAI desde FluxCore
- La herramienta `file_search` de Assistants funciona, pero no hay acceso directo

---

## 3. Matriz de Features

### 3.1 Features de Vector Store

| Feature | OpenAI API | FluxCore Local | FluxCore OpenAI |
|---------|------------|----------------|-----------------|
| Crear | ✅ | ✅ | ✅ |
| Listar | ✅ Paginado | ✅ Sin paginar | ✅ Sin paginar |
| Recuperar | ✅ | ✅ | ✅ |
| Actualizar nombre | ✅ | ✅ | ✅ |
| Actualizar metadata | ✅ | ❌ | ❌ |
| Actualizar expires_after | ✅ | 🟡 Diferente | ❌ |
| Eliminar | ✅ | ✅ | ✅ |
| Búsqueda semántica | ✅ VS.search() | ✅ pgvector | ❌ NO IMPLEMENTADO |
| file_counts tracking | ✅ Automático | 🟡 Manual | ❌ No sincronizado |

### 3.2 Features de Archivos

| Feature | OpenAI API | FluxCore Local | FluxCore OpenAI |
|---------|------------|----------------|-----------------|
| Agregar archivo | ✅ | ✅ | ✅ |
| Listar archivos | ✅ Con filtros | ✅ Sin filtros | ✅ Sin filtros |
| Estado del archivo | ✅ Automático | ✅ Local | 🟡 Polling manual |
| Atributos personalizados | ✅ | ❌ | ❌ |
| Chunking configurable | ✅ | 🟡 Global RAG | ❌ |
| Recuperar contenido | ✅ | ✅ textContent | ❌ |
| File batches | ✅ | ❌ | ❌ |
| Eliminar archivo | ✅ | ✅ | ✅ |

### 3.3 Features de Búsqueda

| Feature | OpenAI API | FluxCore Local | FluxCore OpenAI |
|---------|------------|----------------|-----------------|
| Query embedding | ✅ Interno | ✅ embedding.service | N/A |
| Búsqueda vectorial | ✅ VS.search() | ✅ pgvector | ❌ NO EXISTE |
| Filtros por atributos | ✅ | ❌ | ❌ |
| Score threshold | ✅ | ✅ minScore | N/A |
| Rewrite query | ✅ | ❌ | N/A |
| Ranking options | ✅ | ❌ | N/A |
| max_num_results | ✅ 1-50 | ✅ topK | N/A |

---

## 4. Problemas Críticos Identificados

### 4.1 🔴 CRÍTICO: Sin búsqueda nativa para OpenAI Vector Stores

**Descripción:** 
FluxCore no implementa el endpoint `POST /vector_stores/{id}/search`. Esto significa que los vector stores de OpenAI NO pueden ser consultados directamente.

**Impacto:**
- Solo funciona a través de `file_search` en Assistants
- No hay forma de hacer RAG manual con VS de OpenAI
- Inconsistencia entre backend local y OpenAI

**Solución propuesta:**
Implementar `searchOpenAIVectorStore` en `openai-sync.service.ts`

### 4.2 🔴 CRÍTICO: file_counts no sincronizado

**Descripción:**
Cuando se agregan/eliminan archivos en OpenAI, el contador local `fileCount` no se actualiza automáticamente.

**Impacto:**
- UI muestra información desactualizada
- No hay visibilidad de archivos `in_progress` o `failed`

**Solución propuesta:**
Sincronizar `file_counts` desde OpenAI al cargar el vector store.

### 4.3 🟡 ALTA: Sin soporte para chunking_strategy

**Descripción:**
OpenAI permite configurar `max_chunk_size_tokens` y `chunk_overlap_tokens` por archivo o vector store. FluxCore no expone esta configuración para el flujo OpenAI.

**Impacto:**
- Todos los archivos usan chunking "auto"
- No hay control sobre la calidad del indexado

**Solución propuesta:**
Agregar parámetros de chunking al crear/agregar archivos.

### 4.4 🟡 ALTA: Sin atributos de archivo

**Descripción:**
OpenAI permite hasta 16 pares clave-valor por archivo para filtrado en búsquedas. FluxCore no implementa esto.

**Impacto:**
- No se puede filtrar por tenant, categoría, fecha, etc.
- Menor precisión en búsquedas multi-documento

**Solución propuesta:**
Agregar columna `attributes jsonb` y exponer en API.

### 4.5 🟡 MEDIA: Sin File Batches

**Descripción:**
OpenAI permite subir múltiples archivos en un batch. FluxCore solo permite uno a la vez.

**Impacto:**
- Uploads masivos son lentos
- Más llamadas a la API

**Solución propuesta:**
Implementar endpoint de batch upload.

---

## 5. Comparación de Código

### 5.1 Crear Vector Store

**OpenAI SDK (Correcto):**
```typescript
const vectorStore = await openai.vectorStores.create({
  name: "My Store",
  description: "Description",
  file_ids: ["file-1", "file-2"],
  chunking_strategy: { type: "auto" },
  expires_after: { anchor: "last_active_at", days: 7 },
  metadata: { tenant: "abc123" }
});
```

**FluxCore Actual:**
```typescript
// openai-sync.service.ts
export async function createOpenAIVectorStore(params: CreateOpenAIVectorStoreParams): Promise<string> {
  const payload: any = { name: params.name };
  if (params.fileIds && params.fileIds.length > 0) {
    payload.file_ids = params.fileIds;
  }
  // ❌ FALTA: description
  // ❌ FALTA: chunking_strategy
  // ❌ FALTA: expires_after
  // ❌ FALTA: metadata
  const vectorStore = await api.create(payload);
  return vectorStore.id;
}
```

### 5.2 Agregar Archivo

**OpenAI SDK (Correcto):**
```typescript
const file = await openai.vectorStores.files.create(vsId, {
  file_id: "file-abc123",
  chunking_strategy: {
    type: "static",
    static: { max_chunk_size_tokens: 800, chunk_overlap_tokens: 400 }
  },
  attributes: { category: "support", priority: 1 }
});
```

**FluxCore Actual:**
```typescript
// openai-sync.service.ts
export async function addFileToOpenAIVectorStore(vectorStoreId: string, fileId: string): Promise<void> {
  await vectorStores.files.create(vectorStoreId, {
    file_id: fileId,
    // ❌ FALTA: chunking_strategy
    // ❌ FALTA: attributes
  });
}
```

### 5.3 Búsqueda (NO EXISTE EN FLUXCORE)

**OpenAI SDK:**
```typescript
const results = await openai.vectorStores.search(vsId, {
  query: "¿Cómo funciona?",
  max_num_results: 10,
  ranking_options: { ranker: "auto", score_threshold: 0.7 },
  filters: { type: "eq", key: "category", value: "support" }
});
```

**FluxCore:** ❌ NO IMPLEMENTADO

---

## 6. Resumen de Gaps

| ID | Gap | Severidad | Esfuerzo |
|----|-----|-----------|----------|
| G1 | Sin búsqueda VS OpenAI | 🔴 Crítico | Medio |
| G2 | file_counts no sincronizado | 🔴 Crítico | Bajo |
| G3 | Sin chunking_strategy | 🟡 Alto | Bajo |
| G4 | Sin atributos de archivo | 🟡 Alto | Medio |
| G5 | Sin file batches | 🟡 Medio | Medio |
| G6 | Sin metadata en VS | 🟡 Medio | Bajo |
| G7 | expires_after diferente | 🟡 Medio | Bajo |
| G8 | Sin last_active_at | 🟢 Bajo | Bajo |
| G9 | Sin paginación real | 🟢 Bajo | Bajo |

---

## 7. Conclusión

La implementación actual de FluxCore para Vector Stores de OpenAI tiene **gaps significativos** en:

1. **Lectura de estado desde OpenAI** - Estados y contadores no se leen desde la fuente de verdad
2. **Configuración** - Chunking y atributos no se exponen correctamente
3. **Búsqueda directa** - No existe endpoint para QA/debugging de embeddings

### Alineación con Reglas Arquitectónicas

| Regla | Estado Actual | Recomendación |
|-------|---------------|---------------|
| vs.openai es fuente de verdad | 🔴 Parcialmente violada | Leer siempre desde OpenAI |
| DB local es registro referencial | 🟡 Parcial | No inferir estados |
| OpenAI primero en mutaciones | ✅ Cumple | Mantener |
| Búsqueda no reemplaza Assistant | ✅ Cumple (no existe) | Implementar solo para QA |

Se recomienda un **plan de transformación** que respete estrictamente el documento normativo `ARCHITECTURE_RULES_VECTOR_STORES.md`.

---

*Documento generado como parte de la auditoría de arquitectura FluxCore 2026.*
*Actualizado: 2026-01-23 para conformidad con reglas arquitectónicas.*
