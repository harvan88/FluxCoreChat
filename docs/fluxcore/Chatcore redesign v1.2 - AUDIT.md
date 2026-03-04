# Auditoría Crítica — Chatcore Redesign v1.2
**Fecha de auditoría:** 2026-02-25  
**Método:** Lectura exhaustiva del código fuente actual + contraste con la propuesta  
**Estado:** 🔴 NO APTO PARA IMPLEMENTAR — requiere decisiones de diseño fundamentales  

---

## 0. Resumen de hallazgos

La propuesta v1.2 tiene ambición arquitectónica correcta, pero **no se hizo interrogando al código existente**. Al confrontar el documento con la realidad del codebase, aparecen **huecos estructurales graves** que, si se implementan sin resolver, crearán deuda técnica peor que la actual.

| Categoría | Severidad | §Sección |
|---|---|---|
| **Manejo de multimedia (audio, imagen, video, docs)** | � Alta → 🟢 Validado | §1 |
| Semántica de eliminación de mensajes | 🔴 Crítica | §2 |
| Inmutabilidad y congelamiento de chat | 🔴 Crítica | §3 |
| Migración: ¿renombrar, eliminar, o coexistir? | 🔴 Crítica | §4 |
| Conflicto con flujos existentes (dual write) | 🟡 Alta | §5 |
| `content` JSONB sin contrato | 🔴 Crítica | §6 |
| conversation_participants vs. relationship | 🟡 Alta | §7 |
| WebSocket broadcasting — ruptura de contrato | 🟡 Alta | §8 |

---

## §1. ¿Qué pasa cuando alguien envía un audio, imagen, video o documento en vez de texto?

### Actualización 2026-02-27 — Evidencia operativa

Tras la verificación directa en código se confirma que el flujo activo de chat **ya usa el sistema unificado de assets descrito en “Asset Infrastructure – Diseño Unificado”**:

1. **Ingesta única por sesiones de asset**
   - Frontend (`useAssetUpload`, `ChatView`, `AssetUploader`) crea sesión, sube el archivo y hace commit siempre contra `/api/assets/upload-*`, obteniendo `assetId` para cada adjunto.
   - Backend (`assets.routes.ts`, `assetGatewayService`) valida permisos/MIME, guarda en el Storage Adapter y consolida el registro en `assets` + `asset_upload_sessions`.

2. **Persistencia referencial**
   - `MessageService.createMessage` solo acepta adjuntos con `assetId` y por cada ítem ejecuta `assetRelationsService.linkAssetToMessage`, dejando `message_assets` como fuente de verdad.
   - `MessageMedia` en `packages/db/src/schema/messages.ts` define `assetId` obligatorio; el JSONB `content.media[]` funciona como vista ligera que referencia el Asset estable.

3. **Entrega/renderizado**
   - `MessageBubble` resuelve cada media vía `AssetPreview` utilizando el `assetId` + cuenta del operador, por lo que la UI ya no depende de URLs hardcodeadas.

Conclusión: el rediseño propuesto ya está materializado para chat core. Los hallazgos restantes de esta sección deben enfocarse en las brechas aún abiertas (enriquecimientos no-audio, decisiones IA, etc.), pero **no es necesario plantear una migración adicional de `media_attachments` → assets** porque la ruta oficial de chat ya opera sobre assets.

### Lo que dice la propuesta v1.2
**Nada.** El documento v1.2 no menciona archivos multimedia, adjuntos, audio, imágenes, video, ni documentos en ninguna parte. Habla de `event_type`, `parent_id`, `metadata`, y `version`, pero **ignora por completo que los mensajes pueden no ser texto**.

### Lo que el código actual SÍ soporta hoy

El sistema actual tiene un flujo de multimedia bastante completo. A continuación el inventario exacto de lo que existe:

#### 1.1 — Tipos de media soportados

**Tipos definidos** (`packages/db/src/schema/messages.ts` línea 55-63):
```typescript
export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  attachmentId?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  waveformData?: any;
}
```

**Contenido de un mensaje** (`packages/db/src/schema/messages.ts` línea 77-82):
```typescript
export interface MessageContent {
  text: string;           // El texto del mensaje
  media?: MessageMedia[]; // Array de adjuntos multimedia
  location?: MessageLocation;  // Ubicación (lat/lon)
  buttons?: MessageButton[];   // Botones interactivos
}
```

**El campo `content` en la DB es `JSONB`** — acepta cualquier JSON pero TypeScript espera esta estructura.

#### 1.2 — Límites y validación de archivos

**Tabla de límites actual** (`apps/api/src/services/file-upload.service.ts` líneas 7-30):

| Tipo | Tamaño máximo | MIME types permitidos |
|---|---|---|
| `image` | 10 MB | `image/jpeg`, `image/png`, `image/webp` |
| `document` | 50 MB | `application/pdf`, `application/msword`, `.docx`, `text/plain` |
| `audio` | 20 MB | `audio/webm`, `audio/mp3`, `audio/mpeg`, `audio/ogg`, `video/webm` |
| `video` | 100 MB | `video/mp4`, `video/webm` |

**NOTA:** `video/webm` está en AMBAS listas (audio Y video). Esto es intencional porque algunos navegadores graban audio con MIME `video/webm`.

#### 1.3 — Flujo de upload (cómo sube un archivo al sistema)

Hay **tres endpoints** de upload:

| Endpoint | Qué recibe | Qué hace de especial |
|---|---|---|
| `POST /api/accounts/:accountId/avatar/upload-session` | Metadata del archivo (JSON) | Crea sesión soberana en AssetGateway (scope `profile_avatar`, TTL 15m, valida MIME/size) |
| `PUT /api/assets/upload/:sessionId` | FormData con `file` | Sube binario a la sesión (AssetGateway aplica límites y guarda blob temporal) |
| `POST /api/accounts/:accountId/avatar/upload/:sessionId/commit` | JSON opcional (`uploadedBy`) | AssetRegistry crea el Asset (`scope: profile_avatar`, dedup), actualiza `accounts.avatarAssetId` y dispara auditoría |
| `POST /upload/file` | image, document, audio, video | (LEGACY) Valida MIME + tamaño, guarda en `/uploads/{type}/{fecha}/`, crea `media_attachments` |
| `POST /upload/audio` | Solo audio | (LEGACY) Convierte a MP3, genera waveform visual, guarda en `media_attachments` con waveformData |

**Flujo real del audio:**
```
Frontend: AudioRecorderPanel → graba en webm/ogg/opus
  → POST /upload/audio
    → audioConverterService.convertToMp3(file)  // Convierte a MP3 (para Whisper)
    → audioProcessingService.generateWaveform(file) // Genera barras visuales
    → fileUploadService.upload({ file, type: 'audio', waveformData })
      → Valida MIME y tamaño
      → Guarda archivo en /uploads/audio/{fecha}/{uuid}.mp3
      → INSERT media_attachments (con waveformData)
    → Responde con { attachment, url, waveformData }
```

**Tablas de almacenamiento de media:**

```
media_attachments
├── id UUID PK
├── message_id UUID FK → messages (nullable, se vincula después)
├── type TEXT ('image'|'video'|'audio'|'document')
├── url TEXT (ruta relativa al archivo)
├── filename TEXT (nombre sanitizado)
├── mime_type TEXT
├── size_bytes INT
├── duration_seconds INT (nullable, para audio/video)
├── thumbnail_url TEXT (nullable, para imágenes)
├── waveform_data JSONB (para audio - barras visuales)
├── metadata JSONB
└── created_at TIMESTAMP

message_assets (tabla de join separada)
├── message_id UUID PK
├── asset_id UUID PK
├── version INT DEFAULT 1
├── position INT DEFAULT 0
└── linked_at TIMESTAMP
```

**🔴 Problema:** Hay DOS sistemas de vinculación de media a mensajes:
1. `media_attachments.message_id` — FK directa (se usa en el upload)
2. `message_assets` — tabla de join M:N con version y position (definida pero NO usada en el flujo principal)

Esto es ambigüedad arquitectónica. ¿Cuál es la fuente de verdad?

#### 1.4 — El flujo de transcripción de audio (Burn-In)

**Esto es lo que mencionaste: "el sistema transcribe y escribe la transcripción en el lugar del mensaje".**

El flujo completo funciona así:

```
1. Mensaje llega con media:audio
   → MessageCore.receive() persiste el mensaje con content = { text: "", media: [{type:"audio",...}] }
   → Emite evento 'core:message_received'

2. MediaOrchestratorService escucha 'core:message_received'
   → Busca en content.media[] un item con type='audio' o mimeType que empiece con 'audio/'
   → Si el mensaje ya tiene __fluxcore.transcribed = true, SKIP (evita bucle)
   → Si encuentra audio, llama a audioEnrichmentService.enrichAudioMessage()

3. AudioEnrichmentService.enrichAudioMessage()
   → PASO 1: Descarga el audio (desde asset storage o URL local/remota)
   → PASO 2: Convierte a MP3 vía audioConverterService
   → PASO 3: Envía a OpenAI Whisper API → obtiene transcription + language
   → PASO 4 (BURN-IN): Actualiza el mensaje ORIGINAL en la DB:
     content = {
       ...contenido_original,
       text: "la transcripción del audio",  // ← REEMPLAZA el text vacío
       __fluxcore: {
         transcribed: true,
         transcriptionLanguage: "es",
         processedAt: "2026-02-25T..."
       }
     }
   → PASO 5: RE-EMITE 'core:message_received' con el contenido actualizado
     (Esto hace que MessageDispatchService lo trate como un mensaje de texto nuevo → la IA responde)
   → PASO 6: Guarda en message_enrichments (tabla de metadata)
   → PASO 7: Emite 'media:enriched' al event bus
```

**La clave:** La transcripción se "quema" (burn-in) directamente en `content.text`. Para el resto del sistema, el mensaje de audio **se convierte** en un mensaje de texto con metadata adicional en `__fluxcore`. La IA ve la transcripción como texto normal.

#### 1.5 — ¿Qué pasa con los otros tipos de media? (imagen, video, documento)

**`MediaOrchestratorService`** (líneas 79-86):
```typescript
// Si hay media pero no es audio, logueamos para debugging
if (envelope.content?.media && envelope.content.media.length > 0) {
    logTrace(`[MediaOrchestrator] 📁 Other media detected (not audio)`, {
        mediaTypes: envelope.content.media.map((m: any) => m.type || m.mimeType)
    });
}
```

**Respuesta directa: Para imágenes, videos y documentos, el sistema NO hace nada especial.** Solo:
- Se graban como parte del `content.media[]` en la DB
- El frontend los renderiza según el tipo (imagen → `<img>`, audio → `<audio>`, documento → link de descarga)
- La IA NO recibe imagen, video ni documento — solo recibe el `content.text`

#### 1.6 — ¿Qué ve la IA cuando llega un mensaje con imagen?

Cuando alguien envía una imagen sin texto, el sistema actual hace esto:

1. `MessageCore.receive()` persiste: `content = { text: "", media: [{type:"image", url: "...", ...}] }`
2. `MediaOrchestratorService` lo evalúa → no es audio → solo loguea
3. `MessageDispatchService` lo recibe → `envelope.content.text = ""` → la IA recibe texto vacío
4. El `ChatProjector` (línea 340): `if (text)` → `""` es falsy → **NO inserta el mensaje** vía Kernel
5. **El mensaje se pierde silenciosamente para el flujo del Kernel**

**Sin embargo**, por el flujo legacy (MessageCore → coreEventBus), el mensaje SÍ se persiste en la DB, SÍ aparece en el chat del frontend, y SÍ puede disparar el MessageDispatchService. Pero la IA recibe `text: ""` y en muchos runtimes genera una respuesta genérica o ninguna.

#### 1.7 — ¿Cómo renderiza el frontend cada tipo de media?

**`MessageBubble.tsx`** discrimina por tipo:

| Tipo | Renderizado |
|---|---|
| `image` | `<img>` con lazy loading, max height 256px |
| `audio` | `<audio controls>` nativo del navegador + waveform visual |
| `video` | ❌ **No hay case 'video' explícito** → cae en `default` → se renderiza como link de descarga |
| `document` | Link `<a>` con icono de archivo, nombre y tamaño |
| Sin URL ni assetId | Muestra "No se puede mostrar este adjunto" |

**🔴 Problema:** Los videos se renderizan como documentos (link de descarga) en vez de como `<video>`.

### 🔴 Preguntas sin respuesta que el arquitecto debe decidir

1. **¿La IA debe "ver" imágenes?** (Visión por computador / multimodal)
   - Si sí: necesita un servicio de enriquecimiento similar al audio (OCR, image captioning, etc.)
   - Si no: ¿el mensaje de solo-imagen queda como mensaje sin texto para la IA? ¿Responde "no puedo ver imágenes"?

2. **¿La IA debe "ver" documentos?** (PDF, Word, etc.)
   - Si sí: necesita extracción de texto (similar a RAG)
   - Hoy el sistema tiene RAG/vector store — ¿se usa para documentos enviados en chat o solo para assets pre-cargados?

3. **¿La IA debe "ver" videos?**
   - Probablemente no en v1. Pero ¿debería extraer un frame? ¿Transcribir el audio del video?

4. **¿Un mensaje SOLO con imagen (sin texto) es válido?**
   - Hoy se persiste pero la IA no lo procesa y el ChatProjector lo ignora
   - ¿Debe tener un `content.text` automático como `"[Imagen adjunta]"` o `"[Documento: factura.pdf]"`?

5. **¿El burn-in de audio es la estrategia correcta para el futuro?**
   - **Pro:** Simple. La IA solo maneja texto. Todo downstream funciona sin cambios.
   - **Contra:** Se pierde información. El `content.text` original se sobreescribe con la transcripción. Si la transcripción es mala (ruido, idioma incorrecto), el dato original se pierde.
   - **Alternativa:** Guardar la transcripción en un campo separado: `content.transcription` o en `metadata.enrichments.audio_transcription`. No mutar `content.text`.

6. **¿`media_attachments` y `message_assets` coexisten o uno reemplaza al otro?**
   - `media_attachments`: tabla plana con FK directa a messages
   - `message_assets`: tabla M:N con version y position (más flexible)
   - Hoy ambas existen pero solo `media_attachments` se usa activamente
   - **¿Cuál sobrevive en el rediseño?**

7. **¿El campo `content.media[]` en el JSONB debe seguir existiendo?**
   - Hoy el media va duplicado: está en `content.media[]` del JSONB Y en `media_attachments` como tabla
   - ¿Se normaliza? (solo en tabla, no en JSONB)
   - ¿Se mantiene denormalizado para performance de lectura?
   - **El rediseño v1.2 no menciona esto**

8. **¿Qué pasa si el archivo se borra pero el mensaje sigue?**
   - Hoy los archivos son physical files en `/uploads/`. Si se borran, el `content.media[].url` apunta a un 404.
   - ¿Se usa soft-delete para archivos? ¿Se mantiene metadata pero se marca como eliminado?
   - Si se vuelve a descargar, ¿hay expiración de URLs?

### Recomendación para el arquitecto

**Definir una Política de Enriquecimiento para cada tipo de media ANTES de tocar el schema:**

```
TIPO MEDIA    | IA LO VE?  | MECANISMO DE ENRIQUECIMIENTO              | EFECTO EN content
audio         | SÍ (vía    | Whisper transcription → burn-in en        | content.text = transcripción
              | transcr.)  | content.text + __fluxcore.transcribed=true | (¿o campo separado?)
              |            |                                            |
imagen        | NO (v1)    | Futuro: OCR/captioning                    | content.text permanece vacío
              | SÍ (v2?)   | → Guardar caption en metadata             | o "[Imagen adjunta: caption]"
              |            |                                            |
video         | NO (v1)    | Futuro: frame extraction + audio track    | content.text permanece vacío
              |            |                                            |
documento     | NO (v1)    | Futuro: text extraction → RAG             | content.text permanece vacío
              | SÍ (v2?)   | o burn-in de resumen                      | o "[Doc: filename - resumen]"
              |            |                                            |
location      | NO         | Sin enriquecimiento                       | content.location con lat/lon
              |            |                                            |
botones       | SÍ         | El texto de los botones va en content      | content.buttons[]
```

---

## §2. Eliminación de mensajes — ¿Para quién? ¿Hasta cuándo?

### Lo que dice la propuesta
La propuesta v1.2 §2.5 dice: *"Un mensaje nunca se edita en el lugar"* — pero **NO habla de eliminación en absoluto**. El concepto "eliminar" no aparece en todo el documento.

### Lo que dice el código actual

**`message.service.ts` línea 75-77:**
```typescript
async deleteMessage(messageId: string) {
  await db.delete(messages).where(eq(messages.id, messageId));
}
```
**Hard delete. Borrado físico de la fila.** Sin preguntar quién lo pide, sin verificar propiedad, sin rastro.

**`messages.routes.ts` línea 174-206:**
```typescript
case 'DELETE':
  // Verificar que el mensaje existe
  const message = await messageService.getMessageById(params.id);
  // Eliminar mensaje (soft delete o hard delete)
  await messageService.deleteMessage(params.id);
```
El comentario dice "soft delete o hard delete" pero la implementación es **hard delete**. No hay verificación de que el usuario sea el autor del mensaje. Cualquier participante autenticado puede borrar cualquier mensaje.

**`conversation.service.ts` línea 316-324:**
```typescript
// Delete all messages in the conversation
await db.delete(messages).where(eq(messages.conversationId, conversationId));
// Delete the conversation
await db.delete(conversations).where(eq(conversations.id, conversationId));
```
Borrado masivo de toda la conversación. También hard delete.

### 🔴 Preguntas sin respuesta

1. **¿"Eliminar para mí" vs "Eliminar para todos"?**
   - WhatsApp tiene ambas opciones. ¿Meetgar las tendrá?
   - Si solo "para mí": necesitas una tabla `message_visibility` o flag por participante. No está en la propuesta.
   - Si "para todos": ¿se permite siempre o hay ventana de tiempo?

2. **¿Quién puede eliminar qué?**
   - ¿Solo el autor puede eliminar su mensaje? (Lo lógico)
   - ¿El dueño de la cuenta business puede eliminar mensajes del cliente? (Discutible — ¿y la evidencia legal?)
   - ¿Un observer puede eliminar? (No debería)

3. **¿Cuándo ya NO se puede eliminar?**
   - ¿Se aplica ventana de tiempo? (Ej: WhatsApp permite borrar para todos dentro de ~2 días)
   - ¿Si el mensaje ya fue procesado por la IA? (¿Tiene sentido borrar algo que ya generó una acción?)
   - ¿Si la conversación está `archived`? ¿`closed`?

4. **¿Hard delete o soft delete?**
   - Si la respuesta es "mensaje como evento causal" (la visión de v1.2), entonces **hard delete contradice la filosofía**. Un evento que ocurrió no puede des-ocurrir.
   - ¿El approach correcto es `is_deleted: true` + `deleted_by: account_id` + `deleted_at: timestamp`?
   - ¿Se mantiene el contenido para auditoría/compliance, pero se marca como invisible?

5. **¿Qué pasa con las cadenas causales?**
   - Si edité un mensaje (v1.2: `original_id → msg_1`), y luego borro `msg_1`, ¿qué pasa con la cadena de versiones?
   - Si reaccioné a un mensaje (`parent_id → msg_1` con `event_type: 'reaction'`), y se borra `msg_1`, ¿la reacción queda huérfana?
   - El schema propuesto tiene `REFERENCES messages(id)` en `parent_id` y `original_id`. **Un hard delete rompería integridad referencial.**

6. **¿Qué pasa con los archivos multimedia al eliminar?**
   - Si un mensaje con audio se borra, ¿se borra el archivo físico en `/uploads/`?
   - ¿Se borra el registro en `media_attachments`? (Tiene `ON DELETE CASCADE` desde messages)
   - ¿Se borra el enrichment en `message_enrichments`? (También `ON DELETE CASCADE`)
   - ¿Se borra el `message_assets` correspondiente?
   - **Si es soft-delete, los archivos siguen consumiendo storage. ¿Hay política de cleanup?**

### Recomendación
La propuesta necesita una sección completa §2.6 "Política de eliminación" que defina:
```
REGLA: Los mensajes NUNCA se eliminan físicamente.
MECANISMO: Soft-delete con visibilidad por participante.

message_deletions:
  id UUID PK
  message_id UUID REFERENCES messages(id)
  deleted_by TEXT NOT NULL  -- account_id que pidió el borrado
  scope TEXT CHECK (scope IN ('self', 'all'))
  deleted_at TIMESTAMPTZ NOT NULL
  
REGLAS:
  scope='self' → siempre permitido, sin límite de tiempo
  scope='all' → solo el autor, dentro de ventana configurable, 
                 Y solo si el mensaje no fue respondido (parent_id apunta a él)
```

---

## §3. ¿Cuándo se congela el chat? ¿Cuándo es inalterable?

### Lo que dice la propuesta
No dice nada. No hay concepto de "congelamiento" o "inmutabilidad temporal".

### Lo que dice el código actual
- `conversations.status` puede ser: `'active' | 'archived' | 'closed'`
- Pero **ningún code path verifica el status antes de insertar un mensaje**:
  - `MessageCore.receive()` no verifica status
  - `ChatProjector.projectMessage()` no verifica status
  - `messages.routes.ts POST` no verifica status
  - `handleWidgetMessage` no verifica status

**Conclusión: Actualmente se puede enviar un mensaje a una conversación `closed`.** Eso es un bug silencioso.

### 🔴 Preguntas sin respuesta

1. **¿Qué significa cada status?**
   - `active`: ¿se puede editar, eliminar, enviar?
   - `archived`: ¿solo lectura pero reversible? ¿se puede reactivar?
   - `closed`: ¿sellado permanente? ¿auditoría? ¿legal?

2. **¿Quién puede cambiar el status?**
   - ¿Cualquier participante puede archivar?
   - ¿Solo el business owner puede cerrar?
   - ¿El sistema cierra automáticamente por inactividad?

3. **¿Qué operaciones bloquea cada status?**
   ```
   STATUS    | ENVIAR | EDITAR | ELIMINAR(self) | ELIMINAR(all) | ARCHIVAR | CERRAR
   active    | ✅    | ✅    | ✅            | ⏰ ventana    | ✅      | ✅
   archived  | ❌    | ❌    | ✅?           | ❌            | N/A     | ✅?
   closed    | ❌    | ❌    | ❌            | ❌            | ❌      | N/A
   ```
   **Nada de esto está definido ni implementado.**

4. **¿Existe "modo observador"?**
   - La propuesta menciona role `observer` en `conversation_participants`. 
   - ¿Un observer puede enviar mensajes? Si no, ¿cómo se bloquea? No hay lógica de roles en ningún service.

5. **¿Qué pasa con los archivos multimedia cuando se congela el chat?**
   - Si la conversación está `closed`, ¿se pueden seguir descargando los archivos?
   - ¿Se archivan en cold storage?
   - ¿Existen políticas de retención? (Ej: "eliminar archivos después de 90 días de inactividad")

### Recomendación
Necesita una máquina de estados explícita:
```
active → archived (reversible, por cualquier participante)
active → closed (irreversible, por business owner o sistema)
archived → active (re-apertura)
archived → closed (cierre definitivo)
closed → ∅ (terminal, inalterable)
```

Y un guard centralizado:
```typescript
function assertConversationAllows(conversation: Conversation, operation: 'send' | 'edit' | 'delete' | 'archive') {
  const rules: Record<string, string[]> = {
    'active': ['send', 'edit', 'delete', 'archive'],
    'archived': ['delete'], // solo soft-delete para sí mismo
    'closed': [], // nada
  };
  if (!rules[conversation.status]?.includes(operation)) {
    throw new Error(`CONVERSATION_${conversation.status.toUpperCase()}_FORBIDS_${operation.toUpperCase()}`);
  }
}
```

---

## §4. Estrategia de migración — ¿Eliminar, renombrar, coexistir?

### Lo que dice la propuesta
- Fase 0: "Borrar auto-relaciones y datos en dev"
- Fase 1: "Schema aditivo — columnas nuevas con defaults — no rompen nada existente"
- Fase 5: "Deprecar `conversations.account_id`", "Eliminar SyncManager del chat activo"

### Lo que dice el código actual

**Tablas en juego:**

| Tabla | Columnas relevantes | Estado real |
|---|---|---|
| `conversations` | `relationship_id` (nullable desde 040), `owner_account_id`, `visitor_token`, `linked_account_id` | Ya modificada por WES-180 |
| `relationships` | `account_a_id`, `account_b_id`, `actor_id` | Estable |
| `messages` | `sender_account_id`, `signal_id`, `from_actor_id`, `to_actor_id` | Activa |
| `media_attachments` | `message_id` FK, `type`, `url`, `waveform_data` | Activa |
| `message_enrichments` | `message_id` FK, `extension_id`, `type`, `payload` | Activa |
| `message_assets` | `message_id + asset_id` PK compuesta, `version`, `position` | **Definida pero poco usada** |
| `fluxcore_cognition_queue` | `conversation_id`, `account_id`, `target_account_id` | Activa |

### 🔴 Problemas con la propuesta

1. **La propuesta ignora que `conversations` ya fue modificada (migración 040).**
   - `relationship_id` ya es nullable
   - `owner_account_id` ya existe
   - `visitor_token` ya existe
   - La propuesta habla de agregar `conversation_type` pero no menciona estos campos ya existentes.

2. **La tabla `conversation_participants` propuesta DUPLICA información que ya está en `relationships` + `conversations`.**
   - Hoy: `conversations → relationship → (accountA, accountB)` = los participantes
   - Hoy: `conversations.owner_account_id + visitor_token` = participantes en visitor flow
   - Propuesta: `conversation_participants` con `account_id, role, identity_type, visitor_token`
   - **¿Se eliminan `owner_account_id` y `visitor_token` de `conversations`?** No lo dice.
   - **¿Se sigue usando `relationships` para saber quiénes participan?** ¿O `conversation_participants` lo reemplaza?

3. **¿Qué pasa con el `unread_count_a` / `unread_count_b`?**
   - Hoy están hardcoded como "A" y "B" en `conversations`.
   - Con `conversation_participants`, ¿se mueve el unread count al participante?
   - Si sí, ¿cómo se migran los contadores existentes?

4. **El script de migración Fase 1 (§9) tiene un bug conceptual:**
   ```sql
   INSERT INTO conversation_participants (conversation_id, account_id, role, identity_type)
   SELECT c.id, r.account_a_id, 'initiator', 'registered'
   FROM conversations c JOIN relationships r ON c.relationship_id = r.id
   ```
   ¿Qué pasa con las conversaciones donde `relationship_id IS NULL`? (visitor flows, ya existen por migración 040). **Se quedan sin participantes.**

5. **Los campos propuestos para `messages` entran en conflicto con lo existente:**
   - Propuesta: `event_type TEXT DEFAULT 'message'`
   - Existente: `type varchar('type') -- 'incoming' | 'outgoing' | 'system'`
   - **Hay DOS campos `type`/`event_type`.** ¿Coexisten? ¿Uno depreca al otro? ¿"System" en `type` es lo mismo que `event_type: 'system'`?

6. **No hay plan de migración para las tablas de multimedia:**
   - ¿`media_attachments` sigue existiendo? ¿Se integra con el nuevo `metadata JSONB`?
   - ¿`message_enrichments` sigue existiendo? ¿O se absorbe en el nuevo `metadata`?
   - ¿`message_assets` (tabla M:N con versioning) es el modelo que sobrevive?
   - **Estas tres tablas más el `content.media[]` en JSONB = cuatro lugares donde vive la info de media**

### Recomendación
**Necesita una tabla de mapping explícita:**
```
CAMPO ACTUAL                    | DESTINO PROPUESTO              | ACCIÓN
conversations.relationship_id   | conversation_participants       | KEEP (FK a relationship sigue siendo útil)
conversations.owner_account_id  | conversation_participants       | MIGRATE TO participant role='owner'
conversations.visitor_token     | conversation_participants       | MIGRATE TO participant.visitor_token
conversations.unread_count_a    | conversation_participants       | MIGRATE TO participant.metadata.unread
conversations.unread_count_b    | conversation_participants       | MIGRATE TO participant.metadata.unread
messages.type ('incoming'...)   | ¿? coexiste con event_type?     | DEFINIR relación
messages.from_actor_id          | ¿? relación con event model?    | DEFINIR
messages.to_actor_id            | ¿? relación con event model?    | DEFINIR
messages.content.media[]        | ¿normalizar a tabla?            | DEFINIR
media_attachments               | ¿unificar con message_assets?   | DEFINIR
message_enrichments             | ¿absorber en metadata JSONB?    | DEFINIR
message_assets                  | ¿tabla principal de media?      | DEFINIR
```

---

## §5. Conflicto de flujos — Dual Write Problem

### El problema
El sistema actual tiene **DOS caminos para crear un mensaje**:

**Camino A** — Via Kernel (RFC-0001):
```
messages.routes.ts POST → chatCoreGateway.certifyIngress() → Kernel → Journal 
  → ChatProjector.projectMessage() → INSERT messages
```

**Camino B** — Via WebSocket (Legacy):
```
ws-handler.ts case 'message' → chatCoreGateway.certifyIngress() → Kernel
  → PERO TAMBIÉN → messageCore.send() → INSERT messages (duplicado!)
```

En el ws-handler, **después de que el Kernel certifica**, se llama a `messageCore.send()` que persiste OTRO registro del mismo mensaje.

### Relación con la propuesta
La propuesta v1.2 no aborda esto. Si se agregan `event_type`, `parent_id`, `version`, etc., el dual write problem se agrava porque:
- El projector crea el mensaje con `event_type='message'`, `version=1`
- MessageCore crea el mismo mensaje sin esos campos (usa defaults)
- ¿Cuál es la fuente de verdad?

### Impacto en multimedia
El dual write es especialmente problemático con media porque:
- El archivo se sube UNA vez (`POST /upload/audio`)
- Pero el mensaje puede insertarse DOS veces
- `media_attachments.message_id` solo puede apuntar a UNO de los dos inserts
- El otro mensaje queda sin media vinculada

### Recomendación
**Resolver el dual write ANTES de agregar complejidad al schema.** El ws-handler no debería llamar a `messageCore.send()` después de la certificación del Kernel. El Kernel ya encola el signal, y el ChatProjector ya proyecta el mensaje.

---

## §6. `content` JSONB sin contrato enforceable

### Estado actual
El campo `content` acepta cualquier JSON. La estructura `MessageContent` es sugerencia TypeScript, no enforcement runtime.

**El ChatProjector extrae contenido así** (`chat-projector.ts` línea 323):
```typescript
const text = evidence?.content?.text ?? evidence?.text ?? evidence?.body;
```

Esto significa que hay **tres formatos de content** conviviendo:
1. `{ content: { text: "hola" } }` — formato MessageContent
2. `{ text: "hola" }` — formato plano
3. `{ body: "hola" }` — formato externo (¿WhatsApp?)

### Impacto en multimedia
- Si un mensaje llega con `content: { media: [{type:"audio",...}] }` **sin `text`**, el ChatProjector NO lo inserta (línea 340: `if (text)` es falso)
- El MediaOrchestrator SÍ lo detecta (busca en `content.media[]`), pero si el ChatProjector no insertó la fila, no hay `messageId` para enriquecer
- **Para el camino del Kernel, un mensaje de solo-imagen o solo-audio que viene sin texto NO existe en el sistema**

### El burn-in crea un patrón frágil
```typescript
// AudioEnrichmentService línea 70
text: transcriptionResult.transcription,  // SOBREESCRIBE content.text
```
Si el usuario mandó un audio CON texto (caption), la transcripción **sobreescribe el caption original**. No hay merge ni preservación.

**Ejemplo:**
```
Antes del burn-in:  { text: "escuchá esto", media: [{type:"audio",...}] }
Después del burn-in: { text: "pero yo creo que deberíamos...", media: [{type:"audio",...}], __fluxcore: { transcribed: true } }
```
El caption "escuchá esto" se perdió.

### Recomendación
Definir contrato enforceable de content. Propuesta:
```typescript
interface MessageContent {
  text?: string;           // Texto del usuario (nunca se sobreescribe)
  transcription?: string;  // Texto generado por enriquecimiento
  media?: MessageMedia[];
  location?: MessageLocation;
  buttons?: MessageButton[];
  enrichments?: {          // Metadata de enriquecimiento
    audio?: { transcription: string; language?: string; model: string; processedAt: string; };
    image?: { caption?: string; ocrText?: string; model: string; };
    document?: { extractedText?: string; summary?: string; };
  };
}
```

---

## §7. `conversation_participants` vs `relationships` — ¿Redundancia o reemplazo?

### El dilema central
La propuesta crea `conversation_participants` pero no elimina `relationships` como fuente de verdad de "quién participa".

**Hoy, para saber quiénes están en una conversación:**
```typescript
// conversation.service.ts línea 178
const rel = accountRelationships.find(r => r.id === conv.relationshipId);
const otherAccountId = rel.accountAId === accountId ? rel.accountBId : rel.accountAId;
```

**Con la propuesta, sería:**
```sql
SELECT account_id FROM conversation_participants WHERE conversation_id = ?
```

**Pero ambos coexistirían.** ¿Cuál es la fuente de verdad?

### 🔴 Escenarios problemáticos

1. **Un participant se agrega a `conversation_participants` pero no existe en `relationships`.**
   - ¿Es válido? Si no, ¿por qué existe la tabla separada?

2. **Se agrega un observer a la conversación via `conversation_participants`.**
   - ¿Se modifica `relationships`? No tiene concepto de "observer".

3. **Un participante se da de baja (`unsubscribed_at IS NOT NULL`).**
   - ¿Se actualiza la relationship? ¿El otro participante ve que el primero "se fue"?

4. **El WebSocket broadcasting todavía usa `broadcastToRelationship(relationshipId)`.**
   - ¿Se cambia a `broadcastToParticipants(conversationId)`?

### Recomendación
Definir explícitamente:
```
QUESTION: ¿conversation_participants REEMPLAZA a relationships como fuente de participación?
  → Si SÍ: migration plan para eliminar relationship.accountAId/accountBId como ref de participación
  → Si NO: definir cuándo se usa cada uno y cómo se sincronizan
```

---

## §8. WebSocket broadcasting — ruptura de contrato

### Estado actual
Todo el broadcasting está vinculado a `relationshipId`:
```typescript
// ws-handler.ts línea 43
const subscriptions = new Map<string, Set<any>>();  // key = relationshipId
```

### Con la propuesta
Si hay observers, conversaciones multi-participante, o anonymous threads sin relationship, **el modelo de subscripción actual se rompe**.

La propuesta no incluye plan de migración para WebSocket.

---

## §9. Resumen de decisiones pendientes

| # | Decisión | Impacto si no se resuelve |
|---|---|---|
| 1 | ¿La IA debe ver imágenes/videos/docs? | Mensajes de solo-imagen invisibles para la IA |
| 2 | ¿El burn-in de audio sobreescribe o usa campo separado? | Captions perdidos, datos mutados |
| 3 | ¿Un mensaje sin texto pero con media es válido? | ChatProjector lo descarta silenciosamente |
| 4 | ¿Eliminar mensaje = soft o hard? | Integridad referencial rota con parent_id/original_id |
| 5 | ¿Eliminar para mí vs. para todos? | UX incompleta, privacidad |
| 6 | ¿Ventana de eliminación (cuánto tiempo)? | Mensajes eliminables para siempre o nunca |
| 7 | ¿Qué status bloquea qué operaciones? | Mensajes en conversaciones cerradas |
| 8 | ¿conversation_participants reemplaza o complementa relationships? | Dos fuentes de verdad |
| 9 | ¿type vs event_type — coexisten? | Ambigüedad semántica |
| 10 | ¿El dual write (Kernel + MessageCore) se resuelve primero? | Duplicados, media huérfana |
| 11 | ¿Migración de conversations.unread_count_a/b? | Contadores perdidos |
| 12 | ¿WebSocket broadcast por participant en vez de relationship? | Observers y anonymous no reciben |
| 13 | ¿media_attachments vs message_assets vs content.media[]? | 4 fuentes de verdad para media |
| 14 | ¿Qué pasa con archivos multimedia al eliminar/archivar? | Storage leak o pérdida de datos |
| 15 | ¿Política de retención de archivos? | Storage crece sin control |

---

## §10. Propuesta de proceso

**No implementar v1.2 tal cual.** En su lugar:

### Paso 1 — Resolver fundamentos (antes de tocar schema)
1. Definir política de enriquecimiento por tipo de media (§1)
2. Decidir si burn-in sobreescribe o usa campo separado (§6)
3. Decidir eliminación soft/hard + scope + ventana (§2)
4. Definir máquina de estados de conversation + guard (§3)
5. Resolver dual write problem (§5)

### Paso 2 — Clarificar modelo relacional (antes de crear tablas)
6. Decidir: `conversation_participants` reemplaza o complementa `relationships` (§7)
7. Definir relación semántica `type` vs `event_type` (§4.5)
8. Unificar `media_attachments` vs `message_assets` vs `content.media[]` (§4.6)
9. Definir plan de WebSocket migration (§8)

### Paso 3 — Redactar v1.3 con decisiones tomadas
10. Incorporar todas las decisiones como reglas concretas
11. Incluir tabla de mapping campo-por-campo (§4 recomendación)
12. Incluir test cases para cada edge case identificado

### Paso 4 — Implementar con tests
13. Una migración por decisión, no una migración monolítica
14. Tests de integridad para cada regla

---

*Auditoría generada por confrontación directa del documento v1.2 contra los siguientes archivos del codebase:*
- `packages/db/src/schema/messages.ts` — Schema de messages + enrichments + tipos MessageContent
- `packages/db/src/schema/conversations.ts` — Schema de conversaciones
- `packages/db/src/schema/relationships.ts` — Schema de relaciones
- `packages/db/src/schema/media-attachments.ts` — Schema de adjuntos multimedia
- `packages/db/src/schema/message-assets.ts` — Schema de join M:N mensajes↔assets
- `packages/types/src/entities/message.ts` — Tipos de message, media, location, buttons
- `packages/types/src/entities/conversation.ts` — Tipos de conversación
- `apps/api/src/services/message.service.ts` — CRUD de mensajes (incluye hard delete)
- `apps/api/src/services/conversation.service.ts` — CRUD de conversaciones
- `apps/api/src/services/media-orchestrator.service.ts` — Orquestador de media (detecta audio)
- `apps/api/src/services/audio-enrichment.service.ts` — Transcripción Whisper + burn-in
- `apps/api/src/services/file-upload.service.ts` — Upload con validación MIME/tamaño
- `apps/api/src/services/message-dispatch.service.ts` — Dispatch a IA/runtime
- `apps/api/src/routes/upload.routes.ts` — Endpoints de upload (avatar, file, audio)
- `apps/api/src/routes/messages.routes.ts` — Endpoints de mensajes
- `apps/api/src/core/message-core.ts` — Core de mensajería
- `apps/api/src/core/projections/chat-projector.ts` — Projector (ignora mensajes sin texto)
- `apps/api/src/services/fluxcore/chatcore-gateway.service.ts` — Gateway al Kernel
- `apps/web/src/components/chat/MessageBubble.tsx` — Renderizado de tipos de media
- `apps/web/src/components/chat/AudioRecorderPanel.tsx` — Grabación de audio
