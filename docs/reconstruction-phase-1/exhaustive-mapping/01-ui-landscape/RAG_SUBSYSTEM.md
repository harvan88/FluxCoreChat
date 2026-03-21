---
id: "rag-subsystem"
type: "subsystem"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/components"
---

# Subsistema RAG (Retrieval Augmented Generation) - FluxCore

**Fecha:** 2026-03-19  
**Versión:** v8.3  
**Componente Principal:** `apps/web/src/components/fluxcore/components/RAGConfigSection.tsx`  
**Componentes de Vector Stores:** `apps/web/src/components/fluxcore/vectorStores/`  
**Esquema BD:** `packages/db/src/schema/fluxcore-rag-configurations.ts`, `fluxcore-vector-stores.ts`

---

## 🚨 **PROBLEMAS CRÍTICOS IDENTIFICADOS**

### 1. **Inconsistencia UI vs Schema en RAG Config**
- **Problema:** UI define `minScore` range 0.1-0.7 pero schema default es 0.700
- **Impacto:** Valores altos pueden filtrar demasiados resultados haciendo búsqueda ineficaz
- **Evidencia:** `RAGConfigSection.tsx:339-341` vs `fluxcore-rag-configurations.ts:96`

### 2. **Configuración Fragmentada**
- **Problema:** UI solo expone subset de configuración (chunking, embedding, retrieval básico)
- **Impacto:** Funcionalidades avanzadas (hybrid search, reranking, OCR) no accesibles por UI
- **Evidencia:** Schema tiene 112 líneas vs UI con 372 líneas enfocadas en basics

**Acción requerida:** Evaluar si simplificar schema o expandir UI para cobertura completa.

---

## 🎯 1. Definición y Propósito

El **RAG (Retrieval Augmented Generation)** en FluxCore es el sistema que permite a las IA acceder a conocimiento externo vectorizado para enriquecer sus respuestas con información contextual relevante.

**Invariantes Fundamentales:**
- **Dual Backend:** Puede operar con `local` (pgvector) o `openai` (OpenAI Vector Stores)
- **Configuración Granular:** Cada Vector Store puede tener su propia configuración RAG
- **Soberanía de Datos:** Los documentos vectorizados permanecen bajo control del account
- **Procesamiento Inteligente:** Chunking, embedding y retrieval configurables por tipo de contenido

---

## 📋 2. Interfaz de Configuración RAG (`RAGConfigSection.tsx`)

Componente especializado para configurar los parámetros de procesamiento y búsqueda de Vector Stores.

### 2.1 Estructura del Componente
- **✅ VERIFICADO:** Usa `CollapsibleSection` para cada categoría con toggle de habilitación
- **Evidencia en código:** `RAGConfigSection.tsx:192-253` - CollapsibleSection de chunking
- **Evidencia en código:** `RAGConfigSection.tsx:255-305` - CollapsibleSection de embedding
- **Evidencia en código:** `RAGConfigSection.tsx:307-360` - CollapsibleSection de retrieval

### 2.2 Autoguardado con Debounce
- **✅ VERIFICADO:** Implementa debounce de 600ms para evitar guardar cada cambio
- **Evidencia en código:** `RAGConfigSection.tsx:146-152` - `debouncedSave` con setTimeout 600ms
- **Evidencia en código:** `RAGConfigSection.tsx:117-144` - `persistConfig` con PUT a `/api/fluxcore/rag-config`
- **Estado visual:** Líneas 363-366 muestran "Guardando..." o errores

### 2.3 Configuración de Chunking
- **Estrategias disponibles:** Fixed, Recursive, Sentence, Paragraph
  - **✅ VERIFICADO:** `CHUNKING_STRATEGIES` array con 4 opciones
  - **Evidencia en código:** `RAGConfigSection.tsx:61-66` - definición de estrategias
  - **Evidencia en código:** `RAGConfigSection.tsx:204-223` - renderizado de botones de estrategia
- **Tamaño de fragmento:** 100-2000 tokens en pasos de 50
  - **✅ VERIFICADO:** SliderInput con rango definido
  - **Evidencia en código:** `RAGConfigSection.tsx:230-236` - slider de sizeTokens
- **Solapamiento:** 0-200 tokens en pasos de 10
  - **✅ VERIFICADO:** SliderInput para overlapTokens
  - **Evidencia en código:** `RAGConfigSection.tsx:244-250` - slider de overlap

### 2.4 Configuración de Embeddings
- **Proveedores:** OpenAI, Cohere, Local
  - **✅ VERIFICADO:** `EMBEDDING_PROVIDERS` array con modelos específicos
  - **Evidencia en código:** `RAGConfigSection.tsx:68-72` - definición de proveedores
  - **Evidencia en código:** `RAGConfigSection.tsx:268-288` - botones de selección de provider
- **Modelos:** Dinámicos según proveedor seleccionado
  - **✅ VERIFICADO:** Select que se actualiza según provider
  - **Evidencia en código:** `RAGConfigSection.tsx:292-302` - select de modelos filtrados

### 2.5 Configuración de Retrieval
- **Top K:** 1-20 fragmentos a recuperar
  - **✅ VERIFICADO:** SliderInput con rango 1-20
  - **Evidencia en código:** `RAGConfigSection.tsx:322-328` - slider de topK
- **Similitud mínima:** 0.1-0.7 (⚠️ **PROBLEMA IDENTIFICADO**)
  - **✅ VERIFICADO:** SliderInput con rango 0.1-0.7 pero default 0.3
  - **Evidencia en código:** `RAGConfigSection.tsx:336-342` - slider de minScore
  - **⚠️ INCONSISTENCIA:** Schema default es 0.700, muy alto para retrieval efectivo
- **Tokens máximos:** 500-8000 tokens en respuesta
  - **✅ VERIFICADO:** SliderInput con rango 500-8000
  - **Evidencia en código:** `RAGConfigSection.tsx:351-357` - slider de maxTokens

---

## 🗄️ 3. Modelo de Datos - Vector Stores

### 3.1 Tabla Principal (`fluxcore_vector_stores`)
- **Dual Backend:** `backend` puede ser 'local' o 'openai'
  - **✅ VERIFICADO:** Schema soporta ambos backends
  - **Evidencia en código:** `fluxcore-vector-stores.ts:58` - campo backend con default 'local'
- **Sincronización OpenAI:** Campos específicos para mantener sincronización
  - **✅ VERIFICADO:** Campos alineados con OpenAI API
  - **Evidencia en código:** `fluxcore-vector-stores.ts:62-87` - metadata, fileCounts, expiresAfter
- **Legacy Compatibility:** Campos mantenidos por compatibilidad
  - **✅ VERIFICADO:** Campos legacy claramente marcados
  - **Evidencia en código:** `fluxcore-vector-stores.ts:89-107` - campos legacy con comentarios

### 3.2 Archivos en Vector Stores (`fluxcore_vector_store_files`)
- **Procesamiento:** Estados 'pending', 'processing', 'completed', 'failed'
  - **✅ VERIFICADO:** Schema define estados válidos
  - **Evidencia en código:** `fluxcore-vector-stores.ts:161-163` - definición de status
- **Chunking Strategy:** Configuración específica por archivo
  - **✅ VERIFICADO:** Soporta estrategias OpenAI
  - **Evidencia en código:** `fluxcore-vector-stores.ts:173-174` - chunkingStrategy JSONB
- **Atributos de Búsqueda:** Hasta 16 pares clave-valor para filtrado
  - **✅ VERIFICADO:** Attributes JSONB para búsquedas OpenAI
  - **Evidencia en código:** `fluxcore-vector-stores.ts:170-171` - attributes field

---

## ⚙️ 4. Configuración RAG Granular (`fluxcore-rag-configurations.ts`)

### 4.1 Chunking Configuration
- **Estrategias:** 7 tipos incluyendo 'semantic', 'page', 'custom'
  - **✅ VERIFICADO:** Type `ChunkingStrategy` con opciones completas
  - **Evidencia en código:** `fluxcore-rag-configurations.ts:17-24` - definición completa
- **Configuración Avanzada:** Separators custom, regex, min/max size
  - **✅ VERIFICADO:** Campos granulares para control fino
  - **Evidencia en código:** `fluxcore-rag-configurations.ts:70-75` - campos avanzados

### 4.2 Embedding Configuration
- **Proveedores:** 6 opciones incluyendo 'google', 'azure', 'custom'
  - **✅ VERIFICADO:** Type `EmbeddingProvider` completo
  - **Evidencia en código:** `fluxcore-rag-configurations.ts:29-35` - todos los proveedores
- **Configuración Custom:** Endpoint URL y API key references
  - **✅ VERIFICADO:** Soporte para endpoints personalizados
  - **Evidencia en código:** `fluxcore-rag-configurations.ts:89-90` - campos custom

### 4.3 Retrieval Configuration
- **Búsqueda Híbrida:** Combinación de vectorial + keyword
  - **✅ VERIFICADO:** `hybridSearchEnabled` con weight configurable
  - **Evidencia en código:** `fluxcore-rag-configurations.ts:100-101` - configuración híbrida
- **Re-ranking:** Cohere, cross-encoder, custom
  - **✅ VERIFICADO:** Soporte para re-ranking post-retrieval
  - **Evidencia en código:** `fluxcore-rag-configurations.ts:104-107` - configuración rerank

### 4.4 Processing Configuration
- **OCR:** Reconocimiento de texto en imágenes
  - **✅ VERIFICADO:** `ocrEnabled` con configuración de lenguaje
  - **Evidencia en código:** `fluxcore-rag-configurations.ts:119-120` - configuración OCR
- **Extracción de Metadata:** Campos configurables
  - **✅ VERIFICADO:** `extractMetadata` con fields personalizables
  - **Evidencia en código:** `fluxcore-rag-configurations.ts:122-125` - metadata fields

---

## 🔄 5. Flujo End-to-End

### 5.1 Configuración de Vector Store
1. Usuario crea/abre Vector Store → UI muestra `RAGConfigSection`
2. Usuario ajusta parámetros → Debounce de 600ms → PUT `/api/fluxcore/rag-config`
3. Backend guarda en `fluxcore_rag_configurations` con scope vectorStoreId

### 5.2 Procesamiento de Documentos
1. Usuario sube archivo → Se crea registro en `fluxcore_vector_store_files`
2. Sistema aplica chunking según configuración → Divide en fragments
3. Sistema genera embeddings según provider/model → Vectoriza fragments
4. Fragments vectorizados se almacenan según backend (local pgvector / OpenAI)

### 5.3 Retrieval en Tiempo Real
1. Asistente con Vector Store vinculado recibe query
2. Sistema aplica configuración retrieval (topK, minScore, hybrid)
3. Sistema busca fragments vectoriales según backend
4. Results se filtran por similitud y se limitan por maxTokens
5. Contexto recuperado se inyecta en prompt del asistente

---

## 📚 6. Dependencias Clave

- **UI:** `CollapsibleSection`, `SliderInput`, `useAuthStore`
- **Backend:** `/api/fluxcore/rag-config` endpoint
- **Schema:** `fluxcore-rag-configurations.ts`, `fluxcore-vector-stores.ts`
- **Processing:** Servicios de chunking, embedding, retrieval
- **Storage:** pgvector (local) u OpenAI Vector Stores (cloud)

---

## 🎭 7. Comportamientos Especiales

- **Autoguardado Inteligente:** Debounce de 600ms para evitar sobrecarga
- **Validación en Tiempo Real:** Sliders con rangos validados y feedback visual
- **Compatibilidad Dual:** Mismo UI funciona para local y OpenAI backends
- **Configuración Heredable:** Default configs por cuenta con override por Vector Store
- **Estado Sincronizado:** Para OpenAI, estado se lee de la API fuente de verdad

---

## 🚨 8. Problemas Identificados y Decisiones Arquitectónicas

### 8.1 Inconsistencia de Retrieval Score
- **Problema:** UI permite 0.1-0.7 pero schema default es 0.700
- **Impacto:** 0.7 es muy alto para pgvector cosine search (max ~0.70)
- **Decisión requerida:** Ajustar default a 0.3 o validar rango según backend

### 8.2 Cobertura Incompleta de UI
- **Problema:** UI no expone hybrid search, reranking, OCR, metadata avanzada
- **Impacto:** Funcionalidades del schema no accesibles para usuarios
- **Decisión requerida:** Expandir UI o marcar como features avanzadas

### 8.3 Dual Backend Complexity
- **Problema:** Schema mantiene campos legacy y OpenAI-specific
- **Impacto:** Complejidad de mantenimiento y posible inconsistencia
- **Decisión requerida:** Unificar modelo o separar schemas por backend
