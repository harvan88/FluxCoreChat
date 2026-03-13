# ChatCore — Diseño Definitivo v1.3
**Versión:** 1.3  
**Estado:** DECISIONES TOMADAS — listo para implementar  
**Alcance:** ChatCore únicamente. FluxCore no se modifica.  
**Premisa:** Estamos en desarrollo. No hay datos de producción que preservar. Se reconstruye el schema de ChatCore limpio y soberano.

---

## Las 6 Decisiones Fundamentales

### Decisión 1 — ¿Qué es eliminar un mensaje?

**Modelo WhatsApp. Soft delete con alcance y ventana de tiempo.**

- Un mensaje nunca se borra físicamente. El contenido se reemplaza por `[Este mensaje fue eliminado]` y se marca con `deleted_at` + `deleted_by` + `deleted_scope`.
- **Eliminar para todos** (`deleted_scope: 'all'`): permitido dentro de **60 minutos** desde `created_at`. Después de esa ventana, imposible.
- **Eliminar para mí** (`deleted_scope: 'self'`): permitido en cualquier momento. Solo desaparece para quien eliminó.
- El `content` original se preserva en DB. Se envía como `null` al frontend cuando `deleted_scope = 'all'`. Para `deleted_scope = 'self'` se filtra en la query del participante que eliminó.
- Si el mensaje tiene respuestas (`parent_id` apuntando a él), el padre queda visible como `[Este mensaje fue eliminado]`. Las respuestas no se tocan. Integridad referencial preservada.
- Assets vinculados: al eliminar para todos, el asset se marca `archived` en su ciclo de vida. La política de retención del Asset System decide cuándo se elimina el binario.

```sql
deleted_at    TIMESTAMPTZ,
deleted_by    TEXT,
deleted_scope TEXT CHECK (deleted_scope IN ('self', 'all'))
```

---

### Decisión 2 — ¿Cuándo una conversación se congela?

**Dos mecanismos independientes, mismo efecto: inmutabilidad.**

**Mecanismo A — Ventana de edición (automático):**
Un mensaje es editable durante **15 minutos** desde `created_at`. Guard en el endpoint: `IF NOW() > created_at + INTERVAL '15 minutes' THEN REJECT`.

**Mecanismo B — Publicación aceptada (explícito):**
Cuando una conversación se publica y la otra parte la acepta, ese bloque se congela permanentemente. Irreversible por definición.

```sql
frozen_at     TIMESTAMPTZ,   -- NULL = editable, NOT NULL = congelada
frozen_reason TEXT           -- 'published' | 'legal_hold' | 'manual'
```

**Lo que la ventana NO afecta:**
- `deleted_scope: 'self'` no tiene ventana — es visibilidad personal, no mutación de contenido.
- Reacciones y notas internas se pueden agregar aunque el mensaje padre esté fuera de ventana.

---

### Decisión 3 — Inmutabilidad de `content` y modelo de enriquecimiento

**`content` del usuario es sagrado. Los enriquecimientos le pertenecen al Asset, no al mensaje.**

**Regla absoluta:** `content.text` nunca se sobreescribe después de persistirse. El burn-in actual de audio se elimina.

**Contrato de `content` JSONB:**
```typescript
interface MessageContent {
  text?: string;       // Texto del usuario. NUNCA se modifica post-persist.
  media?: Array<{
    assetId: string;   // Referencia al Asset. Sin URLs, sin datos binarios.
    type: 'image' | 'video' | 'audio' | 'document';
    mimeType?: string;
  }>;
  location?: { lat: number; lon: number; label?: string };
  buttons?: { id: string; label: string; action: string }[];
}
```

**Los enriquecimientos le pertenecen al Asset.**

Una transcripción de audio es una propiedad del contenido binario, no del contexto conversacional donde se envió. Si el mismo asset se comparte en dos conversaciones, se transcribe una sola vez. El Asset System ya deduplica por SHA-256 — los enriquecimientos siguen la misma lógica.

**Tabla `asset_enrichments`:**
```sql
CREATE TABLE asset_enrichments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id   UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
             -- 'audio_transcription' | 'image_caption' | 'document_text' | 'ocr'
             -- extensible: cualquier tipo futuro se agrega sin migración
  payload    JSONB NOT NULL,
             -- audio_transcription: { text, language, model, confidence, processedAt }
             -- image_caption:       { caption, model, processedAt }
             -- document_text:       { extractedText, pageCount, model, processedAt }
             -- ocr:                 { text, confidence, model, processedAt }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, type)  -- un enriquecimiento por tipo por asset
);
CREATE INDEX idx_asset_enrichments_asset ON asset_enrichments(asset_id);
```

**El pipeline de enriquecimiento es automático y agnóstico al origen:**

```
Cualquier servicio (chat, plantilla, plan, importación)
  → AssetGateway → assets (status: pending → ready)
  → Evento: asset:ready { assetId, mimeType }
  → MediaOrchestrator escucha el evento
      ¿Hay enriquecedor registrado para este mimeType?
      SÍ → ejecuta el servicio → INSERT asset_enrichments
      NO → ignora silenciosamente
```

El origen no importa. Si el formato tiene enriquecedor, se enriquece. Agregar soporte para un nuevo formato en el futuro solo requiere un nuevo servicio registrado en `MediaOrchestrator` — sin tocar `assets`, `messages`, ni el chat.

**Cambio de wiring requerido:** `MediaOrchestrator` actualmente escucha `core:message_received`. Debe migrar a escuchar `asset:ready`.

**Cómo la IA construye contexto:**
```typescript
// Context builder del runtime
for (const media of message.content.media) {
  const enrichment = await db.select()
    .from(assetEnrichments)
    .where(and(
      eq(assetEnrichments.assetId, media.assetId),
      eq(assetEnrichments.type, 'audio_transcription') // según tipo
    ))
    .limit(1);

  if (enrichment[0]) {
    context += `Audio transcripto: "${enrichment[0].payload.text}"`;
  } else {
    context += `El usuario envió un ${media.type}. Enriquecimiento no disponible aún.`;
  }
}
```

La IA siempre sabe qué tiene y qué no. Sin suposiciones.

---

### Decisión 4 — ¿Un mensaje sin texto pero con media es válido?

**Sí. Siempre.**

El ChatProjector no puede descartar un mensaje por ausencia de `content.text`. Un mensaje de solo imagen, solo audio, solo documento es un evento legítimo. Se persiste, se encola cognitivamente, y la IA lo procesa con lo que tiene.

```sql
CONSTRAINT message_has_content CHECK (
  content->>'text' IS NOT NULL
  OR jsonb_array_length(COALESCE(content->'media', '[]'::jsonb)) > 0
  OR event_type IN ('reaction', 'system')
)
```

---

### Decisión 5 — `conversation_participants` reemplaza `relationships` como fuente de participación

`conversation_participants` es la única fuente de verdad sobre quién está en una conversación.

`relationships` sobrevive como concepto de negocio — representa el vínculo establecido entre dos cuentas conocidas. No se usa para resolver participación ni para broadcasting.

| Pregunta | Fuente |
|---|---|
| ¿Estas dos cuentas tienen vínculo establecido? | `relationships` |
| ¿Quién está en esta conversación? | `conversation_participants` |
| ¿A quién le mando este evento WebSocket? | `conversation_participants WHERE unsubscribed_at IS NULL` |
| ¿Qué cuenta gobierna la IA? | `conversation_participants WHERE role = 'recipient'` |

```sql
CREATE TABLE conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  account_id      TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('initiator', 'recipient', 'observer')),
  identity_type   TEXT NOT NULL DEFAULT 'registered'
                  CHECK (identity_type IN ('registered', 'anonymous', 'system')),
  visitor_token   TEXT,           -- solo para identity_type = 'anonymous'
  subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,    -- NULL = activo
  UNIQUE (conversation_id, account_id)
);
CREATE INDEX idx_cp_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_cp_account ON conversation_participants(account_id);
CREATE INDEX idx_cp_token ON conversation_participants(visitor_token)
  WHERE visitor_token IS NOT NULL;
```

**Identidad anónima:** el `visitor_token` es una identidad provisional del navegador. Al autenticarse, se promueve a `account_id` real y la conversación migra a `relationship` formal.

---

### Decisión 6 — WebSocket broadcast por `conversationId`

El WebSocket suscribe por `conversationId`. Los destinatarios son `conversation_participants` activos.

```typescript
// ANTES: Map<relationshipId, Set<socket>>
// DESPUÉS: Map<conversationId, Set<socket>>
```

Resuelve de una vez: anonymous threads, observers, conversaciones sin relationship, y cualquier actor futuro incluyendo participantes `system`.

---

## Schema Completo

### `conversations`
```sql
CREATE TABLE conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id   UUID REFERENCES relationships(id),  -- NULL para anonymous_thread
  conversation_type TEXT NOT NULL DEFAULT 'internal'
                    CHECK (conversation_type IN ('internal', 'anonymous_thread', 'external')),
  channel           TEXT NOT NULL DEFAULT 'web'
                    CHECK (channel IN ('web', 'whatsapp', 'telegram', 'webchat', 'external')),
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived', 'closed')),
  frozen_at         TIMESTAMPTZ,
  frozen_reason     TEXT,
  last_message_at   TIMESTAMPTZ,
  last_message_text TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `messages`
```sql
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id         TEXT UNIQUE,
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_account_id TEXT NOT NULL,
  generated_by      TEXT NOT NULL DEFAULT 'human'
                    CHECK (generated_by IN ('human', 'ai', 'system')),
  event_type        TEXT NOT NULL DEFAULT 'message'
                    CHECK (event_type IN (
                      'message', 'reaction', 'edit', 'internal_note', 'system'
                    )),
  content           JSONB NOT NULL,
  parent_id         UUID REFERENCES messages(id),
  original_id       UUID REFERENCES messages(id),
  version           INT NOT NULL DEFAULT 1,
  is_current        BOOLEAN NOT NULL DEFAULT true,
  deleted_at        TIMESTAMPTZ,
  deleted_by        TEXT,
  deleted_scope     TEXT CHECK (deleted_scope IN ('self', 'all')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT message_has_content CHECK (
    content->>'text' IS NOT NULL
    OR jsonb_array_length(COALESCE(content->'media', '[]'::jsonb)) > 0
    OR event_type IN ('reaction', 'system')
  )
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_signal ON messages(signal_id) WHERE signal_id IS NOT NULL;
CREATE INDEX idx_messages_parent ON messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_messages_original ON messages(original_id) WHERE original_id IS NOT NULL;
CREATE INDEX idx_messages_sender ON messages(sender_account_id);
```

### `asset_enrichments` (nueva)
*(Ver Decisión 3 — schema completo arriba)*

### `conversation_participants` (nueva)
*(Ver Decisión 5 — schema completo arriba)*

### `relationships` (solo agrega constraint)
```sql
ALTER TABLE relationships
  ADD CONSTRAINT no_self_relationship CHECK (account_a_id != account_b_id);
```

---

## Lo que no cambia

| Componente | Estado |
|---|---|
| FluxCore completo | Sin cambios |
| Kernel, Dispatcher, Projectors | Sin cambios |
| Sistema de Assets (`assets`, `message_assets`, servicios) | Sin cambios |
| `fluxcore_cognition_queue` | Sin cambios + columna `target_account_id` ya agregada |

FluxCore consume `conversationId` y `accountId` como strings opacos. Si FluxCore requiriera cambios por este rediseño, indicaría un problema de acoplamiento en FluxCore — no en este plan.

---

## Reglas de negocio

```
MENSAJE:
  content.text es inmutable post-persist
  content.media[] solo contiene assetId + type. Sin URLs.
  Eliminar para todos: ventana de 60 minutos desde created_at
  Eliminar para mí: sin restricción de tiempo
  Editar: ventana de 15 minutos desde created_at
  Conversación frozen_at IS NOT NULL → ninguna mutación permitida
  Mensaje sin texto pero con media → válido
  Los enriquecimientos nunca reemplazan el contenido original

ASSET:
  Todo binario es un Asset
  Los enriquecimientos semánticos van a asset_enrichments
  El pipeline de enriquecimiento es automático al evento asset:ready
  Un tipo de enriquecimiento por asset (UNIQUE asset_id + type)
  assets.metadata JSONB → datos técnicos y etiquetas del operador

CONVERSACIÓN:
  frozen_at IS NOT NULL → inmutable, irreversible
  Ventana de edición (15 min) es independiente del congelamiento

PARTICIPACIÓN:
  conversation_participants es la fuente de verdad
  recipient gobierna la IA (PolicyContext)
  visitor_token se promueve a account_id al autenticarse

WEBSOCKET:
  Broadcasting por conversationId
  Destinatarios = conversation_participants WHERE unsubscribed_at IS NULL
```

---

## Orden de implementación

**Fase 0 — Limpieza de datos (SQL, hoy):**
```sql
DELETE FROM messages WHERE conversation_id IN (
  SELECT c.id FROM conversations c
  JOIN relationships r ON c.relationship_id = r.id
  WHERE r.account_a_id = r.account_b_id
);
DELETE FROM conversations WHERE relationship_id IN (
  SELECT id FROM relationships WHERE account_a_id = account_b_id
);
DELETE FROM relationships WHERE account_a_id = account_b_id;
DELETE FROM fluxcore_cognition_queue WHERE processed_at IS NULL;
```

**Fase 1 — SyncManager (frontend):**
Desacoplar `SyncManager` del flujo online. `ChatView` usa `useChat` directo.

**Fase 2 — Schema + ChatProjector:**
Una sola migración: `conversation_participants`, `asset_enrichments`, columnas nuevas en `messages` y `conversations`, constraint en `relationships`. ChatProjector acepta mensajes sin texto, pobla `conversation_participants`, usa `target_account_id` correcto.

**Fase 3 — Enriquecimiento:**
`MediaOrchestrator` migra de `core:message_received` a `asset:ready`. `AudioEnrichmentService` escribe a `asset_enrichments` en lugar de sobreescribir `content.text`. Context builder de IA lee `asset_enrichments`.

**Fase 4 — WebSocket:**
Subscriptions migran de `relationshipId` a `conversationId`. `broadcastToConversation` usa `conversation_participants`.

**Fase 5 — Eliminación y edición:**
Endpoints con reglas de ventana, scope, y guard de conversación frozen.

**Fase 6 — Limpieza final:**
Eliminar `media_attachments`, endpoints legacy de upload, `conversations.account_id`, `SyncManager` offline.

---

## Fuera de alcance v1.3

- Publicación de conversaciones (activa `frozen_reason: 'published'`)
- Widget cross-domain (compartir `visitor_token` entre dominios)
- RAG sobre assets
- Enriquecimiento de imágenes y documentos (infra lista, servicio pendiente)
- Observers como participantes activos

---

*v1.3 — Decisiones tomadas. Sin ambigüedad. Documento único de diseño para ChatCore.*