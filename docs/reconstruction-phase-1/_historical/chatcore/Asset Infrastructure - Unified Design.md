# Asset Infrastructure — Diseño Unificado
**Fecha:** 2026-02-25  
**Estado:** 📐 PROPUESTA DE DISEÑO — para decisión del arquitecto  

---

## ¿Por qué este documento?

Harold, me pediste que te ayude a pensar una infraestructura **estable** que no haya que refactorizar, que sirva para todo: chat, plantillas, IA, RAG, y cualquier cosa futura. Antes de escribir una línea de código, necesitamos entender qué ya existe y qué hay que consolidar.

**La buena noticia:** ya hay MUCHO construido. La mala: hay DOS sistemas paralelos que no se hablan.

---

## 1. Lo que ya existe hoy — Inventario real

### Sistema A: "Asset Management System" (bien diseñado, subutilizado)

Ya construiste un sistema de assets con nivel empresarial:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ASSET MANAGEMENT SYSTEM                          │
│                                                                     │
│  Tabla: assets                                                      │
│  ├── id, accountId, workspaceId                                     │
│  ├── scope: message_attachment | template_asset | execution_plan    │
│  │          shared_internal | profile_avatar | workspace_asset      │
│  ├── status: pending → ready → archived → deleted                   │
│  ├── version (versionado de contenido)                              │
│  ├── checksumSHA256 (deduplicación)                                 │
│  ├── storageKey + storageProvider                                   │
│  ├── encryption + encryptionKeyId                                   │
│  ├── retentionPolicy + hardDeleteAt                                 │
│  └── metadata (JSON libre)                                          │
│                                                                     │
│  Tablas de Relación (cómo se vincula a entidades):                  │
│  ├── message_assets    (message ↔ asset, con version + position)    │
│  ├── template_assets   (template ↔ asset, con version + slot)       │
│  └── plan_assets       (plan ↔ asset, con version + dependency)     │
│                                                                     │
│  Servicios:                                                         │
│  ├── AssetRegistryService  — CRUD, dedup, versionado                │
│  ├── AssetGatewayService   — Sesiones de upload, validación, chunks │
│  ├── AssetRelationsService — Vincular/desvincular a entidades       │
│  ├── AssetAuditService     — Trazabilidad completa                  │
│  ├── AssetPolicyService    — Permisos y políticas                   │
│  ├── AssetDeletionService  — Soft-delete con retención              │
│  └── StorageAdapters       — Local + S3 (abstracción intercambiable)│
│                                                                     │
│  Infraestructura:                                                   │
│  ├── asset_upload_sessions      — Sesiones efímeras con TTL         │
│  ├── asset_audit_logs           — Log inmutable de auditoría        │
│  ├── asset_policies             — Permisos por scope                │
│  └── fluxcore_asset_permissions — Control de acceso FluxCore        │
│                                                                     │
│  Frontend:                                                          │
│  ├── useAssetUpload hook    — Upload con progreso + cancelación     │
│  ├── AssetBrowser           — Navegador de assets                   │
│  ├── AssetUploader          — Componente de upload                  │
│  ├── AssetPreview           — Preview en chat                       │
│  ├── AssetMonitoringPanel   — Panel de monitoreo                    │
│  └── TemplateAssetPicker    — Selector de assets para plantillas    │
│                                                                     │
│  ✅ TIENE: dedup, versioning, audit trail, soft-delete, retención  │
│  ✅ TIENE: storage abstraction (local ↔ S3)                        │
│  ✅ TIENE: sesiones de upload con TTL y progreso                   │
│  ✅ TIENE: relaciones con messages, templates, plans               │
└─────────────────────────────────────────────────────────────────────┘
```

### Sistema B: "File Upload Service" (simple, activamente usado en chat)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FILE UPLOAD SERVICE (legacy)                      │
│                                                                     │
│  Tabla: media_attachments                                           │
│  ├── id, messageId (FK directa a messages)                          │
│  ├── type: image | video | audio | document                        │
│  ├── url (ruta relativa: /uploads/audio/2026-02-25/uuid.mp3)       │
│  ├── filename, mimeType, sizeBytes                                  │
│  ├── durationSeconds, thumbnailUrl                                  │
│  ├── waveformData (JSONB — barras visuales del audio)               │
│  └── metadata (JSONB)                                               │
│                                                                     │
│  Servicios:                                                         │
│  ├── FileUploadService — Validación MIME + tamaño, guarda disco     │
│  ├── AudioConverterService — webm/ogg → mp3                        │
│  ├── AudioProcessingService — genera waveform                      │
│  ├── MediaOrchestratorService — detecta audio, dispara enrichment  │
│  └── AudioEnrichmentService — Whisper transcription + burn-in      │
│                                                                     │
│  Endpoints:                                                         │
│  ├── POST /upload/file   — Archivos con tipo explícito             │
│  ├── POST /upload/audio  — Audio con conversión + waveform         │
│  └── POST /upload/avatar — Fotos de perfil                         │
│                                                                     │
│  ❌ NO TIENE: dedup, versioning, audit trail                       │
│  ❌ NO TIENE: storage abstraction (hardcoded a disco local)        │
│  ❌ NO TIENE: soft-delete ni retención                             │
│  ❌ NO TIENE: sesiones de upload ni progreso                       │
│  ✅ TIENE: procesamiento de audio (conversión + waveform)          │
│  ✅ TIENE: transcripción Whisper + burn-in                         │
│  ✅ TIENE: endpoints activos usados por el chat                    │
└─────────────────────────────────────────────────────────────────────┘
```

### El diagnóstico

**No te falta infraestructura — te sobra.** Tenés DOS sistemas que hacen cosas similares pero que no se conocen entre sí. El Sistema A (Assets) es el diseño correcto. El Sistema B (FileUpload) es el que funciona activamente en chat. La solución NO es crear un tercer sistema — es **conectarlos**.

---

## 2. La visión: Asset como entidad universal de archivo

Tu intuición es correcta: **un Asset NO es un adjunto de mensaje — es una entidad independiente que puede ser referenciada por muchas cosas.**

### Principio fundamental

> **Todo archivo binario que ingresa al sistema es un Asset.**  
> Los mensajes, plantillas, plans, y cualquier entidad futura **referencian** assets — nunca los contienen.

Esto significa:

```
ANTES (hoy):
  Mensaje → content.media[] (URLs hardcoded en JSONB)
  Mensaje → media_attachments (tabla con URL)
  Mensaje → message_assets (tabla con assetId — poco usada)
  Template → template_assets (tabla con assetId)
  
  = 3 formas diferentes de vincular un archivo a un mensaje

DESPUÉS:
  Everything → Asset → StorageAdapter → Archivo físico
  
  Mensaje  ──┐
  Template ──┤   message_assets    ┐
  Plan     ──┤→ template_assets   ├→ assets → StorageAdapter → blob
  RAG      ──┤   plan_assets      │
  Futuro   ──┘   rag_assets (*)   ┘
  
  = 1 forma de vincular un archivo a cualquier cosa
```

### Lo que esto permite EN EL FUTURO sin refactorizar

| Capacidad futura | Cómo se conecta | Qué se necesita agregar |
|---|---|---|
| **IA lee imágenes** (vision/captioning) | `ImageEnrichmentService` → escribe caption → `message_enrichments` | Solo el servicio. El asset ya existe. |
| **IA lee documentos** (PDF extraction) | `DocumentEnrichmentService` → extrae texto → `message_enrichments` o Vector Store | Solo el servicio. El asset ya existe. |
| **RAG sobre archivos del chat** | Indexar contenido del asset en Vector Store | Tabla `vector_store_assets` + sync job |
| **Archivos en templates** (imágenes, PDFs adjuntos) | Ya existe: `template_assets` | Solo conectar el flujo de UI |
| **Compliance/auditoría** | Ya existe: `asset_audit_logs` | Solo asegurar que todos los flujos logueen |
| **Migrar a S3/CloudStorage** | Ya existe: `StorageAdapter` | Solo configurar el adapter de S3 |
| **Dedup de archivos idénticos** | Ya existe: `checksumSHA256` | Solo activar en los flujos de upload |
| **Limpieza automática de archivos viejos** | Ya existe: `retentionPolicy` + `hardDeleteAt` | Solo activar el worker |

**No hay que inventar nada nuevo. Hay que CONECTAR lo que ya existe.**

---

## 3. ¿Qué hacer con cada pieza actual?

### Decisiones que necesitamos tomar

#### Decisión 1: ¿`media_attachments` sobrevive o muere?

| Opción | Pro | Contra |
|---|---|---|
| **A) Eliminar `media_attachments`** | Una sola fuente de verdad. Todo pasa por `assets` + `message_assets`. Limpio. | Hay que migrar el flujo de upload activo. Los endpoints `/upload/*` deben reescribirse. |
| **B) Mantener `media_attachments` como "vista rápida"** | No se rompe nada hoy. Se puede migrar gradualmente. | Dos fuentes de verdad. Se requiere sync. |
| **C) `media_attachments` se convierte en vista materializada de `assets` + `message_assets`** | Mejor de ambos mundos. Los inserts van a `assets`, la vista facilita queries del frontend. | Complejidad de mantener la vista sincronizada. |

**Mi recomendación: Opción A** — pero no de golpe. Plan de migración:

1. **Fase 1:** Los endpoints `/upload/*` crean un Asset (vía AssetRegistryService) Y un `media_attachments` (para compatibilidad). Ambos se crean en la misma transacción.
2. **Fase 2:** El frontend empieza a leer assets vía `message_assets` en vez de `media_attachments`. 
3. **Fase 3:** Cuando todo lee de `assets`, se elimina `media_attachments`.

#### Decisión 2: ¿`content.media[]` sigue existiendo en el JSONB del mensaje?

Hoy, cuando se envía un mensaje con media, la info va en DOS lugares:
- `content.media[]` (dentro del JSONB del mensaje)
- `media_attachments` (tabla separada)

**Mi recomendación: `content.media[]` se convierte en un array de REFERENCIAS, no de datos.**

```typescript
// HOY (datos duplicados):
content = {
  text: "mirá esto",
  media: [{
    type: "image",
    url: "/uploads/image/2026-02-25/abc.jpg",  // ← URL hardcoded
    filename: "foto.jpg",
    mimeType: "image/jpeg",
    size: 1234567
  }]
}

// FUTURO (solo referencia):
content = {
  text: "mirá esto",
  media: [{
    assetId: "uuid-del-asset",  // ← Solo el ID
    type: "image",              // ← Hint para el frontend (no fuente de verdad)
  }]
}
```

**¿Por qué?**
- La URL puede cambiar (migración de storage local a S3)
- El filename puede cambiar (el usuario lo renombra)
- El tamaño puede cambiar (re-compresión)
- El `assetId` NUNCA cambia — es la referencia estable

El frontend resuelve la URL llamando al backend: `GET /api/assets/{assetId}/url` → obtiene URL firmada con TTL.

#### Decisión 3: ¿Qué pasa con la transcripción (burn-in)?

Hoy la transcripción de audio SOBREESCRIBE `content.text`. Esto:
- Funciona bien si el audio no tiene caption
- PIERDE el caption original si el usuario escribió algo junto al audio
- MUTA un dato que debería ser inmutable

**Mi recomendación: Separar transcripción del contenido del usuario.**

```typescript
// HOY (mutación):
content = {
  text: "transcripción del audio aquí",  // ← Sobreescribió el text original
  media: [ ... ],
  __fluxcore: { transcribed: true }       // ← Flag interno metido en el content
}

// FUTURO (separación limpia):
content = {
  text: "esto dijo el usuario como caption",  // ← NUNCA se modifica
  media: [{ assetId: "uuid-del-audio", type: "audio" }]
}

// La transcripción vive en message_enrichments (ya existe esta tabla):
message_enrichments = {
  messageId: "uuid",
  extensionId: "audio_transcription",
  type: "transcription",
  payload: {
    text: "lo que dijo en el audio",
    language: "es",
    model: "whisper-1",
    confidence: 0.95,
    processedAt: "2026-02-25T..."
  }
}
```

**¿Qué gana la IA?** El AI runtime lee PRIMERO `content.text`, LUEGO lee `message_enrichments` para obtener transcripciones/captions/extractos. Así tiene TODA la información sin perder nada.

**¿Y si el audio no tiene text?** `content.text` queda vacío o nulo, y la IA lee la transcripción del enrichment. El prompt del runtime se arma así:

```
Mensaje del usuario:
[Audio adjunto - Transcripción: "lo que dijo en el audio"]
```

#### Decisión 4: ¿Cómo entra un archivo al sistema? (flujo unificado)

Hoy hay dos caminos:
- **Camino A:** `POST /upload/file` → FileUploadService → `media_attachments`
- **Camino B:** `POST /api/assets/upload-session` → AssetGateway → AssetRegistry → `assets`

**Propuesta: UN solo camino, el del Sistema de Assets.**

```
FLUJO UNIFICADO DE INGESTA:

Frontend (cualquier contexto):
  ╔══════════════════════════════════════════════════════════════════╗
  ║  1. useAssetUpload.upload(file)                                 ║
  ║     → createSession() → POST /api/assets/session                ║
  ║     → uploadFile()    → PUT  /api/assets/upload/{sessionId}    ║
  ║     → commit()        → POST /api/assets/commit/{sessionId}    ║
  ║     ← assetId (UUID)  ← respuesta                              ║
  ╚══════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
  Backend (AssetGateway + AssetRegistry):
  ╔══════════════════════════════════════════════════════════════════╗
  ║  2. Session creada con TTL (10 min)                             ║
  ║  3. Validar MIME + tamaño según scope                           ║
  ║  4. Calcular SHA256 para dedup                                  ║
  ║  5. StorageAdapter.upload() → /accountId/assetId/version        ║
  ║  6. INSERT assets (status: 'ready')                             ║
  ║  7. Audit log: 'upload_completed'                               ║
  ╚══════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
  Post-procesamiento (según tipo):
  ╔══════════════════════════════════════════════════════════════════╗
  ║  Si AUDIO:                                                      ║
  ║    → AudioConverterService.convertToMp3()                       ║
  ║    → AudioProcessingService.generateWaveform()                  ║
  ║    → Guardar waveform en asset.metadata                         ║
  ║    → (waveform se devuelve al frontend para renderizado)        ║
  ║                                                                  ║
  ║  Si IMAGEN (futuro):                                            ║
  ║    → ImageEnrichmentService.generateCaption()                   ║
  ║    → Guardar caption en enrichment                              ║
  ║                                                                  ║
  ║  Si DOCUMENTO (futuro):                                         ║
  ║    → DocumentEnrichmentService.extractText()                    ║
  ║    → Guardar texto en enrichment o indexar en VectorStore       ║
  ╚══════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
  Vinculación (según contexto):
  ╔══════════════════════════════════════════════════════════════════╗
  ║  Si es un MENSAJE de chat:                                      ║
  ║    → AssetRelationsService.linkAssetToMessage(messageId, asset) ║
  ║    → content.media = [{ assetId, type: "audio" }]               ║
  ║                                                                  ║
  ║  Si es una PLANTILLA:                                           ║
  ║    → AssetRelationsService.linkAssetToTemplate(templateId, ...) ║
  ║                                                                  ║
  ║  Si es un PLAN:                                                 ║
  ║    → AssetRelationsService.linkAssetToPlan(planId, ...)         ║
  ║                                                                  ║
  ║  Si es un AVATAR:                                               ║
  ║    → scope: 'profile_avatar'                                    ║
  ║    → accountService.updateProfile({ avatarAssetId })            ║
  ╚══════════════════════════════════════════════════════════════════╝
```

---

## 4. El modelo de Enriquecimiento (Enrichment Pipeline)

Este es el punto clave para que la IA pueda trabajar con cualquier tipo de media SIN tener que refactorizar cada vez que se agrega un tipo nuevo.

### Principio

> **El contenido del usuario es inmutable. Los enriquecimientos se AGREGAN, nunca REEMPLAZAN.**

### Cómo funciona

```
                    ┌─────────────────────────────────────────┐
                    │           ENRICHMENT PIPELINE            │
                    │                                          │
                    │  1. Asset ingresado (status: 'ready')    │
                    │     ↓                                    │
                    │  2. Evento: 'asset:ready'                │
                    │     ↓                                    │
                    │  3. MediaOrchestratorService evalúa tipo  │
                    │     ↓                                    │
  ┌─────────────────┼───────────────────────────────────────── │
  │                 │                                          │
  ▼                 ▼                 ▼                        ▼
audio/           image/           application/          video/
  │                 │              pdf|docx                 │
  │                 │                 │                     │
  ▼                 ▼                 ▼                     ▼
AudioEnrich     ImageEnrich     DocEnrich            VideoEnrich
Service         Service (*)     Service (*)          Service (*)
  │                 │                 │                     │
  ▼                 ▼                 ▼                     ▼
Whisper         Vision API      PDF Extract          Extract audio
→ texto          → caption      → texto               → Whisper
→ idioma         → tags         → resumen             → frame
                 → OCR text                            
  │                 │                 │                     │
  └────────────┬────┘                 │                     │
               ▼                      ▼                     ▼
        message_enrichments (tabla existente)
        ┌──────────────────────────────────────────────┐
        │ messageId | extensionId          | payload   │
        │ uuid      | audio_transcription  | {text,lang}│
        │ uuid      | image_caption (*)    | {caption} │
        │ uuid      | document_extract (*) | {text}    │
        │ uuid      | video_audio_tx (*)   | {text}    │
        └──────────────────────────────────────────────┘
        
        (*) = futuro, pero la infra ya está lista
```

### ¿Qué ve la IA?

```typescript
// El runtime arma el contexto del mensaje así:
function buildMessageContext(message: Message, enrichments: MessageEnrichment[]) {
  let context = '';
  
  // 1. Texto del usuario (nunca modificado)
  if (message.content.text) {
    context += message.content.text;
  }
  
  // 2. Enriquecimientos
  for (const enrichment of enrichments) {
    switch (enrichment.type) {
      case 'transcription':
        context += `\n[Audio adjunto - Transcripción: "${enrichment.payload.text}"]`;
        break;
      case 'caption':
        context += `\n[Imagen adjunta - Descripción: "${enrichment.payload.caption}"]`;
        break;
      case 'document_extract':
        context += `\n[Documento adjunto: ${enrichment.payload.filename} - Contenido: "${enrichment.payload.text.slice(0, 500)}..."]`;
        break;
      // futuro: video, location, etc.
    }
  }
  
  // 3. Si no hay texto ni enriquecimiento, indicar el tipo de media
  if (!context && message.content.media?.length) {
    const types = message.content.media.map(m => m.type).join(', ');
    context = `[El usuario envió: ${types}. No se pudo procesar el contenido.]`;
  }
  
  return context;
}
```

**Esto resuelve el problema del ChatProjector que hoy descarta mensajes sin texto.** En vez de `if (text)`, sería `if (text || enrichments.length || content.media?.length)`.

---

## 5. Plan de consolidación (paso a paso)

### Fase 0: Preparación (deuda cero)
**Objetivo:** No romper nada. Solo preparar el terreno.

1. ✅ **Verificar que todas las tablas de assets existen en la DB** (pueden estar definidas en schema pero no migradas)
2. ✅ **Verificar que `message_enrichments` existe en la DB**
3. ✅ **Verificar que los storage adapters funcionan** (al menos el local)

### Fase 1: Asset como fuente de verdad para uploads
**Objetivo:** Todo upload nuevo pasa por el Asset System. `media_attachments` se sigue populando para compatibilidad.

1. **Modificar `/upload/audio`:**
   - Crear Asset vía AssetRegistryService
   - Guardar waveform en `asset.metadata`
   - TAMBIÉN crear `media_attachments` (compatibilidad)
   - Retornar `assetId` además de `url`

2. **Modificar `/upload/file`:**
   - Crear Asset vía AssetRegistryService
   - TAMBIÉN crear `media_attachments` (compatibilidad)
   - Retornar `assetId` además de `url`

3. **Resultado:** Cada archivo tiene un Asset Y un media_attachment. La fuente de verdad empieza a ser el Asset.

### Fase 2: Separar transcripción del content
**Objetivo:** El burn-in deja de mutar `content.text`. Las transcripciones van a `message_enrichments`.

1. **Modificar `AudioEnrichmentService.enrichAudioMessage()`:**
   - NO sobreescribir `content.text`
   - Guardar transcripción en `message_enrichments` (ya tiene la tabla, ya hace `saveEnrichment`)
   - Re-emitir evento con la transcripción como metadata, no como mutación del content

2. **Resultado:** `content.text` del usuario es inmutable. La IA lee transcripciones de enrichments.

### Fase 3: ChatProjector acepta mensajes sin texto
**Objetivo:** Un mensaje de solo-imagen o solo-audio se persiste correctamente vía Kernel.

1. **Modificar `ChatProjector.projectMessage()`:**
   - Cambiar `if (text)` por `if (text || hasMedia || hasEnrichments)`
   - Para mensajes sin texto pero con media, insertar el mensaje y dejar que el pipeline de enrichment lo procese

2. **Resultado:** Los mensajes de solo-media ya no se pierden en el flujo del Kernel.

### Fase 4: Frontend lee assets en vez de media_attachments
**Objetivo:** `MessageBubble` y otros componentes usan `assetId` como fuente de verdad.

1. **Modificar `MessageBubble.tsx`:** 
   - Si `media[].assetId` existe, usar endpoint de assets para obtener URL
   - Si no, fallback a `media[].url` (compatibilidad)

2. **Agregar renderizado de video** (case faltante)

3. **Resultado:** Frontend es asset-first.

### Fase 5: Eliminar `media_attachments` y `FileUploadService`
**Objetivo:** Una sola fuente de verdad.

1. Verificar que NADA lee de `media_attachments`
2. Eliminar la tabla
3. Eliminar `FileUploadService`
4. Los endpoints `/upload/*` se reescriben como wrappers del sistema de Assets

### Fase 6: Agregar enrichment services futuros (cuando se necesiten)
**Objetivo:** Conectar nuevas capacidades sin tocar la infra.

1. `ImageEnrichmentService` → usa OpenAI Vision o similar → guarda caption en `message_enrichments`
2. `DocumentEnrichmentService` → extrae texto de PDF/Word → guarda en `message_enrichments` Y/O indexa en Vector Store
3. Cada uno solo necesita:
   - Escuchar evento `asset:ready`
   - Leer el asset del storage
   - Escribir enrichment
   - Emitir evento de completado

**No toca schema. No toca el core. Solo se agrega.**

---

## 6. El diagrama completo — cómo queda

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CHAT FRONTEND                              │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │AudioPanel│  │ImagePicker   │  │FilePicker    │                  │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘                  │
│       │                │                 │                          │
│       └────────────────┼─────────────────┘                          │
│                        │                                            │
│              useAssetUpload.upload(file)                             │
│                        │                                            │
│  ┌─────────────────────┼────────────────────────────────────────┐   │
│  │  1. createSession   │  2. uploadFile   3. commitUpload       │   │
│  │     ← sessionId     │     (progreso)      ← assetId         │   │
│  └─────────────────────┼────────────────────────────────────────┘   │
│                        │                                            │
│  ┌─────────────────────┼────────────────────────────────────────┐   │
│  │  MessageInput: envía mensaje con                              │   │
│  │  content = { text: "...", media: [{ assetId, type }] }        │   │
│  └─────────────────────┼────────────────────────────────────────┘   │
└────────────────────────┼────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND API                                │
│                                                                     │
│  ┌─ AssetGateway ──────────────────────────────────────────────┐    │
│  │  Session mgmt → Validación → Storage → AssetRegistry       │    │
│  │  → assets (tabla)                                           │    │
│  │  → asset_upload_sessions (tabla)                            │    │
│  │  → asset_audit_logs (tabla)                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ MessageCore ───────────────────────────────────────────────┐    │
│  │  Recibe mensaje → persiste en messages con content          │    │
│  │  → AssetRelationsService.linkAssetToMessage()               │    │
│  │  → Emite 'core:message_received'                            │    │
│  └───────┬─────────────────────────────────────────────────────┘    │
│          │                                                          │
│  ┌───────▼─────────────────────────────────────────────────────┐    │
│  │  MediaOrchestrator (escucha 'core:message_received')        │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │    │
│  │  │AudioEnrich   │  │ImageEnrich   │  │DocEnrich     │      │    │
│  │  │Service       │  │Service (*)   │  │Service (*)   │      │    │
│  │  │              │  │              │  │              │      │    │
│  │  │Descarga asset│  │Descarga asset│  │Descarga asset│      │    │
│  │  │→ MP3         │  │→ Vision API  │  │→ PDF extract │      │    │
│  │  │→ Whisper     │  │→ Caption     │  │→ Texto       │      │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │    │
│  │         │                 │                  │              │    │
│  │         └─────────────────┼──────────────────┘              │    │
│  │                           ▼                                 │    │
│  │            message_enrichments (tabla)                       │    │
│  │            → messageId, extensionId, type, payload          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ ChatProjector ─────────────────────────────────────────────┐    │
│  │  Proyecta al Kernel:                                        │    │
│  │  - Texto del usuario (content.text)                         │    │
│  │  - O indicador de media (content.media[].type)              │    │
│  │  - Ya no descarta mensajes sin texto                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ AI Runtime ────────────────────────────────────────────────┐    │
│  │  buildMessageContext():                                     │    │
│  │  → Lee content.text (inmutable)                             │    │
│  │  → Lee enrichments (transcripción, caption, etc.)           │    │
│  │  → Arma contexto completo para el modelo                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ StorageAdapter (abstracción) ──────────────────────────────┐    │
│  │  LocalStorageAdapter  ←→  S3StorageAdapter (intercambiable) │    │
│  │  → upload, download, delete, getSignedUrl, exists, list    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Conexión con RAG y Vector Stores

Cuando en el futuro necesites que los archivos enviados en el chat sean consultables por la IA (RAG), el flujo sería:

```
1. Asset ingresado (PDF, documento, etc.)
2. DocumentEnrichmentService extrae texto
3. Texto se indexa en Vector Store (ya existe la infra de vector stores)
4. Se crea vínculo: asset.id ↔ vector_store_file.id
5. La IA consulta el Vector Store cuando necesita info del archivo
```

**No se necesita schema nuevo**. La tabla `assets` con su `scope` y `metadata`, más una tabla bridge `vector_store_assets` (similar a `message_assets`), cierra el circuito.

---

## 8. Resumen de decisiones para Harold

| # | Decisión | Mi recomendación | ¿Estás de acuerdo? |
|---|---|---|---|
| 1 | ¿`media_attachments` sobrevive o muere? | Muere gradualmente (Fase 1→5) | |
| 2 | ¿`content.media[]` guarda datos o solo `assetId`? | Solo `assetId` + type hint | |
| 3 | ¿La transcripción de audio sobreescribe `content.text`? | NO. Va a `message_enrichments` | |
| 4 | ¿`content.text` del usuario se modifica alguna vez? | NUNCA. Es inmutable. | |
| 5 | ¿Todo upload pasa por Asset System? | SÍ. `FileUploadService` se depreca. | |
| 6 | ¿Los enrichments se agregan como servicios independientes? | SÍ. Cada tipo de media tiene su servicio. | |
| 7 | ¿El ChatProjector acepta mensajes sin texto? | SÍ. Si tiene media, se persiste. | |
| 8 | ¿Se empieza a implementar image/doc enrichment ahora? | NO. Pero la infra queda lista. | |
| 9 | ¿El flujo de audio actual sigue funcionando durante la migración? | SÍ. La Fase 1 es aditiva. | |

**Nada de esto requiere crear tablas nuevas** (excepto quizás `vector_store_assets` cuando llegue el RAG). Todo usa infraestructura que ya existe.

---

*Este documento se basa en el análisis exhaustivo de 33 archivos relacionados con assets, 4 storage adapters, 6 tablas de schema, y 8 servicios backend ya implementados.*
