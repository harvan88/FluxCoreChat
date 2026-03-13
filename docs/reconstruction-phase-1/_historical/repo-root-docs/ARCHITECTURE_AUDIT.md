# Auditoría Arquitectónica FluxCore

## Principio Violado

> **LOCAL y OPENAI son DOS SISTEMAS DIFERENTES.**
> Crear algo OpenAI **NUNCA** debe crear nada local.
> Crear algo local **NUNCA** debe tocar OpenAI.

---

## 🔴 BUGS CRÍTICOS IDENTIFICADOS

### 1. `createAssistant` crea instrucción LOCAL para asistente OpenAI

**Archivo**: `apps/api/src/services/fluxcore.service.ts:459-494`

```typescript
if (assistantData.runtime === 'openai') {
  // ❌ BUG: Crea instrucción LOCAL para asistente OpenAI
  const systemInstruction = await createInstruction({
    accountId: assistantData.accountId,
    name: `System - ${assistantData.name}`,
    content: assistantData.description || 'Instrucciones del sistema',
    status: 'production',
  });
  // ...
  instructionIds = [systemInstruction.id]; // ❌ Vincula instrucción LOCAL
}
```

**Violación**: Un asistente OpenAI NO debe tener instrucciones locales. Las instrucciones deben vivir SOLO en OpenAI.

---

### 2. Upload de archivos a Vector Store OpenAI crea archivo LOCAL

**Archivo**: `apps/api/src/routes/fluxcore.routes.ts:900-936`

```typescript
// ❌ SIEMPRE crea archivo local primero
const { file: uploadedFile, linkId } = await fileService.uploadAndLink(
  { name, mimeType, sizeBytes, content, accountId, uploadedBy },
  params.id
);

if (store.backend === 'openai') {
  // Luego sube a OpenAI, pero YA CREÓ archivo local
  const openaiFileId = await uploadOpenAIFile(content, file.name);
  // ...
}
```

**Violación**: Para vector stores OpenAI, NO debe existir archivo en base de datos local con contenido. Solo debe existir una referencia al `externalId` de OpenAI.

---

### 3. Instrucciones locales propagan cambios a OpenAI

**Archivo**: `apps/api/src/services/fluxcore.service.ts:896-920`

```typescript
// Al actualizar instrucción local, sincroniza a OpenAI
const openaiTargets = openaiAssistantsUsingInstruction
  .filter((a) => a.runtime === 'openai' && a.externalId);

for (const a of openaiTargets) {
  await openaiSync.updateOpenAIAssistant({
    externalId: a.externalId,
    instructions: safeContent, // ❌ Instrucción local enviada a OpenAI
  });
}
```

**Violación**: Los asistentes OpenAI NO deben depender de instrucciones locales. Si un asistente es OpenAI, sus instrucciones deben editarse directamente en OpenAI (o reflejarse desde OpenAI).

---

### 4. Vector Store Files comparten tabla para LOCAL y OPENAI

**Archivo**: `apps/api/src/services/fluxcore.service.ts:1093-1114`

`addVectorStoreFile` siempre inserta en `fluxcoreVectorStoreFiles`, independientemente del backend.

**Violación**: Los archivos de un vector store OpenAI NO deben almacenarse localmente. Solo deben consultarse desde la API de OpenAI y mostrarse como "reflejo".

---

## 🔴 BUGS UI IDENTIFICADOS

### 5. `VectorStoresView.tsx` muestra RAGConfigSection para OpenAI

**Archivo**: `apps/web/src/components/fluxcore/views/VectorStoresView.tsx:418-422`

```tsx
{/* Configuración RAG */}
<RAGConfigSection
  vectorStoreId={selectedStore.id}
  accountId={accountId}
/>
```

**Violación**: RAGConfigSection contiene controles de chunking, embeddings y retrieval. Estos son conceptos **EXCLUSIVAMENTE LOCALES**. No deben mostrarse para `backend='openai'`.

---

### 6. `VectorStoreFilesSection.tsx` no conoce el backend

**Archivo**: `apps/web/src/components/fluxcore/components/VectorStoreFilesSection.tsx`

- **Línea 201-223**: `handleReprocess` → Solo válido para LOCAL
- **Línea 349-354**: Muestra "fragmentos" (chunks) → Solo válido para LOCAL
- **Línea 365-372**: Botón "Re-procesar" → Solo válido para LOCAL

**Violación**: El componente no recibe `backend` como prop, por lo tanto muestra controles locales para vector stores OpenAI.

---

## 🟡 MEZCLAS IDENTIFICADAS (no son bugs pero evidencian acoplamiento)

### 1. Endpoint GET `/files` tiene lógica condicional por backend

**Archivo**: `apps/api/src/routes/fluxcore.routes.ts:709-774`

```typescript
if (store.backend === 'openai' && store.externalId) {
  // Consulta OpenAI
} else {
  // Retorna local
}
```

### 2. Endpoint DELETE `/files/:fileId` tiene lógica condicional

**Archivo**: `apps/api/src/routes/fluxcore.routes.ts:812-865`

```typescript
if (store.backend === 'openai' && store.externalId) {
  await removeFileFromOpenAIVectorStore(...);
}
// SIEMPRE elimina de base local también
await fluxcoreService.deleteVectorStoreFile(...);
```

---

## ✅ ARQUITECTURA CORRECTA (propuesta)

### Contexto LOCAL

| Entidad | Almacenamiento | Procesamiento |
|---------|---------------|---------------|
| Asistente Local | `fluxcoreAssistants` | Brain local |
| Instrucciones | `fluxcoreInstructions` + versiones | Local |
| Vector Store Local | `fluxcoreVectorStores` | Chunking + Embeddings locales |
| Archivos VS Local | `fluxcoreVectorStoreFiles` | Contenido en storage local |
| Chunks | `fluxcoreDocumentChunks` | Embeddings pgvector |

### Contexto OPENAI

| Entidad | Almacenamiento | Procesamiento |
|---------|---------------|---------------|
| Asistente OpenAI | `fluxcoreAssistants` (solo referencia) | OpenAI API |
| Instrucciones | **NO LOCALES** - solo en OpenAI | OpenAI API |
| Vector Store OpenAI | `fluxcoreVectorStores` (solo referencia) | OpenAI API |
| Archivos VS OpenAI | **NO LOCALES** - consultar OpenAI API | OpenAI API |

### Reglas de oro

1. **`backend='openai'` → NO chunks, NO embeddings, NO contenido local**
2. **`runtime='openai'` → NO instrucciones locales vinculadas**
3. **Solo se almacena**: `id`, `name`, `externalId`, `accountId`, `createdAt`
4. **Todo lo demás viene de OpenAI API en tiempo real**

---

## 📋 REFACTORIZACIÓN COMPLETADA (v2)

### Arquitectura Correcta Implementada

**Principio aplicado**: NO OCULTAR, SEPARAR COMPLETAMENTE.

Los componentes LOCAL y OPENAI son ahora **componentes completamente diferentes**, no el mismo componente con lógica condicional.

### Componentes UI Creados (EXCLUSIVOS OpenAI)

| Componente | Propósito | Ubicación |
|------------|-----------|-----------|
| `OpenAIAssistantConfigView.tsx` | Configuración de asistentes OpenAI | `views/` |
| `OpenAIVectorStoresView.tsx` | Gestión de vector stores OpenAI | `views/` |

Estos componentes:
- NO importan nada de los componentes locales
- NO comparten lógica con AssistantsView o VectorStoresView
- Tienen su propia UI, servicios y flujos

### Flujo de Navegación

```
Usuario crea asistente
    ├── Selecciona "Local" → Abre AssistantsView (vista local)
    └── Selecciona "OpenAI" → Abre OpenAIAssistantConfigView (vista OpenAI)

Usuario selecciona asistente existente
    ├── runtime='local' → Abre AssistantsView
    └── runtime='openai' → Abre OpenAIAssistantConfigView
```

### Cambios en DynamicContainer

- Nuevo case `openai-assistant` → Renderiza `OpenAIAssistantConfigView`
- Nuevo case `openai-vector-stores` → Renderiza `OpenAIVectorStoresView`
- Handler `onOpenFluxCoreItemTab` maneja tipo `openai-assistant`

### Backend (sin cambios adicionales)

Los cambios de backend anteriores se mantienen:
- `createAssistant`: Flujos separados para local/openai
- `updateAssistant`: No sincroniza instrucciones locales a OpenAI
- Upload de archivos: Solo referencia para OpenAI, contenido para local

### Componentes Locales (sin contaminación)

`AssistantsView.tsx`, `VectorStoresView.tsx`, `VectorStoreFilesSection.tsx`:
- NO tienen lógica condicional de OpenAI
- NO ocultan nada
- Son SOLO para recursos locales

---

## 🔍 VALIDACIÓN FINAL

> "Si mañana elimino completamente el runtime local, ¿los asistentes OpenAI siguen funcionando?"

**Respuesta DESPUÉS de refactorización**: ✅ SÍ

Los asistentes OpenAI ahora:
- NO crean instrucciones locales
- NO almacenan contenido de archivos localmente (solo referencia con `externalId`)
- NO sincronizan desde instrucciones locales
- Solo dependen de `externalId` y llamadas a OpenAI API

**Nota**: Los archivos de vector stores OpenAI aún usan la tabla `fluxcoreVectorStoreFiles` como índice/referencia, pero sin contenido local. Una mejora futura podría eliminar completamente esta tabla para OpenAI y consultar directamente la API.
