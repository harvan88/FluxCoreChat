# Chat Interface - Backend-Frontend Mapping

> **Documento**: Mapeo de componentes del wireframe con endpoints y servicios backend existentes
> **Relacionado a**: `CHAT_WIREFRAME_INVENTORY.md`

---

## 1. RESUMEN DE ESTADO

### Leyenda
- ✅ **Soportado**: Backend tiene endpoint/servicio completo
- ⚠️ **Parcial**: Backend tiene funcionalidad pero incompleta para el caso de uso
- ❌ **Gap**: No existe soporte en backend

### Resumen por Área

| Área | Soportado | Parcial | Gaps |
|------|-----------|---------|------|
| Mensajería básica | 4 | 0 | 0 |
| Modos de IA | 3 | 0 | 0 |
| **Header del Chat** | 1 | 0 | 4 |
| **Menú de Opciones** | 0 | 2 | 6 |
| **Hover en Mensajes** | 0 | 0 | 3 |
| **Feedback IA** | 0 | 0 | 2 |
| **Refinación IA** | 0 | 0 | 1 |
| Adjuntos | 1 | 0 | 7 |
| Audio | 0 | 0 | 4 |
| Emojis | 0 | 0 | 2 |
| Selección de mensajes | 0 | 1 | 4 |
| WebSocket | 5 | 1 | 1 |

---

## 2. MAPEO DETALLADO

### 2.0 Header del Chat (Frame 10, 15, 16)

| Componente Frontend | Endpoint Backend | Estado | Notas |
|---------------------|------------------|--------|-------|
| `ChatHeader` - Info contacto | `GET /conversations/:id` | ✅ | Retorna contactName, contactPhone |
| `ChatHeader` - Tags (#) | ❌ No existe | ❌ | Falta sistema de etiquetas |
| `ChatHeader` - Asignación (@) | ❌ No existe | ❌ | Falta asignación de conversaciones |
| `ChatHeader` - Buscar en chat | ❌ No existe | ❌ | Falta `GET /conversations/:id/search` |
| `ChatHeader` - Opciones menú | ⚠️ Parcial | ⚠️ | Algunas acciones existen dispersas |

**GAPS:**
1. **Sistema de Tags**: No hay CRUD para etiquetas de conversación
2. **Asignación**: No hay asignación de conversaciones a usuarios/cuentas
3. **Búsqueda**: No hay búsqueda dentro de conversación

---

### 2.0.1 Menú de Opciones del Header

| Opción del Menú | Endpoint Backend | Estado | Notas |
|-----------------|------------------|--------|-------|
| Reenviar | ❌ No existe | ❌ | Forward de conversación completa |
| Calendario/Programar | ❌ No existe | ❌ | Falta scheduler de mensajes |
| Mención (@) | ❌ No existe | ❌ | Falta sistema de menciones |
| Tag (#) | ❌ No existe | ❌ | Falta CRUD tags |
| Seguridad | ⚠️ Parcial | ⚠️ | Configuración básica existe |
| Buscar | ❌ No existe | ❌ | Falta búsqueda en conversación |
| Descargar | ❌ No existe | ❌ | Falta export de conversación |
| Bloquear | ❌ No existe | ❌ | Falta bloqueo de contactos |
| Compartir | ❌ No existe | ❌ | Falta compartir conversación |
| Eliminar | `DELETE /conversations/:id` | ⚠️ | Existe pero sin soft-delete |

---

### 2.0.2 Hover en Mensajes y Reacciones

| Componente Frontend | Endpoint Backend | Estado | Notas |
|---------------------|------------------|--------|-------|
| `MessageHoverMenu` - Emoji reaction | ❌ No existe | ❌ | Falta sistema de reacciones |
| `MessageHoverMenu` - Opciones | ⚠️ Parcial | ⚠️ | Algunas acciones existen |
| Reacciones emoji en mensaje | ❌ No existe | ❌ | Falta `POST /messages/:id/reactions` |

**GAPS:**
1. **Reacciones**: No hay sistema de reacciones emoji a mensajes
2. **Almacenamiento**: No hay tabla/campo para guardar reacciones

---

### 2.0.3 Feedback de Mensajes IA

| Componente Frontend | Endpoint Backend | Estado | Notas |
|---------------------|------------------|--------|-------|
| 👍 Thumbs Up | ❌ No existe | ❌ | Falta `POST /messages/:id/feedback` |
| 👎 Thumbs Down | ❌ No existe | ❌ | Falta endpoint de feedback negativo |
| Historial de feedback | ❌ No existe | ❌ | Falta tabla `ai_feedback` |

**Endpoint Sugerido:**
```typescript
POST /messages/:id/feedback
  body: {
    type: 'positive' | 'negative',
    reason?: string,
    accountId: string
  }
  returns: { success: boolean }
```

**Schema Sugerido:**
```sql
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  account_id UUID REFERENCES accounts(id),
  type TEXT NOT NULL,  -- 'positive', 'negative'
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2.0.4 Refinación de Mensajes IA

| Componente Frontend | Endpoint Backend | Estado | Notas |
|---------------------|------------------|--------|-------|
| `AIRefinementPanel` - Enviar observación | ❌ No existe | ❌ | Falta `POST /messages/:id/refine` |
| Historial de refinaciones | ❌ No existe | ❌ | Falta almacenamiento de observaciones |
| Regenerar mensaje con observación | ❌ No existe | ❌ | Falta integración con LLM |

**Endpoint Sugerido:**
```typescript
POST /messages/:id/refine
  body: {
    observation: string,
    accountId: string
  }
  returns: {
    refinedMessage: Message,  // Nuevo mensaje generado
    originalMessageId: string
  }
```

**Flujo:**
1. Usuario escribe observación en `AIRefinementPanel`
2. Frontend envía `POST /messages/:id/refine`
3. Backend obtiene mensaje original
4. Backend envía a LLM con contexto + observación
5. Backend crea nuevo mensaje con `generatedBy: 'ai'`
6. Backend relaciona con mensaje original vía `refinedFrom`
7. Frontend muestra nuevo mensaje

**Schema Sugerido:**
```sql
ALTER TABLE messages ADD COLUMN refined_from UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN refinement_observation TEXT;
```

---

### 2.1 Mensajería Básica

| Componente Frontend | Endpoint Backend | Estado | Notas |
|---------------------|------------------|--------|-------|
| `ChatInputBar` - enviar mensaje | `POST /messages` | ✅ | MessageCore maneja persistencia y WS broadcast |
| `MessageTextField` - obtener historial | `GET /conversations/:id/messages` | ✅ | Soporta limit/offset |
| Crear conversación | `POST /conversations` | ✅ | Channels: web, whatsapp, telegram |
| Listar conversaciones | `GET /conversations` | ✅ | Enriquecido con contactName, contactAvatar |

**Endpoints disponibles:**
```
POST /messages
  - body: { conversationId, senderAccountId, content: { text, media?, location?, buttons? }, type?, generatedBy?, replyToId? }
  
GET /conversations/:id/messages
  - query: { limit?, offset? }
  
GET /conversations
POST /conversations
  - body: { relationshipId, channel }
  
PATCH /conversations/:id
  - body: { status? }
```

---

### 2.2 Modos de IA

| Componente Frontend | Endpoint Backend | Estado | Notas |
|---------------------|------------------|--------|-------|
| `AIModeSelector` - obtener modo | `GET /automation/mode/:accountId` | ✅ | Retorna mode, rule, source |
| `AIModeSelector` - cambiar modo | `POST /automation/rules` | ✅ | Modos: automatic, supervised, disabled |
| `AIModeButton` - estado visual | WebSocket `suggestion:*` events | ✅ | Notifica estados de IA |

**Endpoints disponibles:**
```
GET /automation/mode/:accountId
  - query: { relationshipId? }
  - returns: { mode, rule, source }

POST /automation/rules
  - body: { accountId, mode, relationshipId?, config?, enabled? }
  
GET /automation/rules/:accountId

PATCH /automation/rules/:ruleId
  - body: { mode?, config?, enabled? }

DELETE /automation/rules/:ruleId

POST /automation/evaluate
  - body: { accountId, relationshipId?, messageContent?, messageType?, senderId? }
```

**Modos soportados:**
- `automatic`: IA responde automáticamente
- `supervised`: IA sugiere, humano aprueba
- `disabled`: Sin IA

---

### 2.3 Sugerencias de IA (Modo Supervisión)

| Componente Frontend | Endpoint Backend | Estado | Notas |
|---------------------|------------------|--------|-------|
| Solicitar sugerencia | WebSocket `request_suggestion` | ✅ | Requiere conversationId, accountId |
| Aprobar sugerencia | WebSocket `approve_suggestion` | ✅ | Envía mensaje con generatedBy: 'ai' |
| Descartar sugerencia | WebSocket `discard_suggestion` | ✅ | Solo notifica al cliente |

**Eventos WebSocket:**
```typescript
// Solicitar
{ type: 'request_suggestion', conversationId, accountId, relationshipId?, content? }

// Respuestas
{ type: 'suggestion:generating', conversationId }
{ type: 'suggestion:ready', data: { id, suggestedText, confidence, reasoning, alternatives, mode } }
{ type: 'suggestion:disabled', reason, mode }
{ type: 'suggestion:unavailable', reason }
{ type: 'suggestion:auto_sending', suggestionId, delayMs }

// Acciones
{ type: 'approve_suggestion', conversationId, senderAccountId, suggestedText, suggestionId? }
{ type: 'discard_suggestion', suggestionId }
```

---

### 2.4 Adjuntos (GAPS SIGNIFICATIVOS)

| Componente Frontend | Endpoint Backend | Estado | Gap Identificado |
|---------------------|------------------|--------|------------------|
| `AttachmentPanel` - Documento | ❌ No existe | ❌ | Falta `POST /upload/document` |
| `AttachmentPanel` - Cámara | ❌ No existe | ❌ | Falta `POST /upload/photo` o integración cámara |
| `AttachmentPanel` - Galería | ❌ No existe | ❌ | Falta `POST /upload/image` |
| `AttachmentPanel` - Audio (archivo) | ❌ No existe | ❌ | Falta `POST /upload/audio` |
| `AttachmentPanel` - Recibo | ❌ No existe | ❌ | Falta `POST /upload/receipt` |
| `AttachmentPanel` - Ubicación | ❌ No existe | ❌ | Falta endpoint para compartir ubicación |
| `AttachmentPanel` - Quick Reply | ⚠️ Parcial | ⚠️ | Messages soporta `buttons` pero no hay CRUD |
| `AttachmentPanel` - Contacto | ❌ No existe | ❌ | Falta endpoint para compartir contacto |
| Avatar upload | `POST /upload/avatar` | ✅ | Solo para avatares |

**Estado actual de uploads:**
```
POST /upload/avatar
  - body: FormData { file: File }
  - returns: { url, filename }
  - Solo soporta imágenes
  - Almacena en /uploads/avatars/
```

**GAPS CRÍTICOS:**
1. No hay endpoint genérico para subir archivos a mensajes
2. No hay soporte para diferentes tipos de media
3. El schema de mensajes soporta `media[]` pero no hay endpoints para poblarlo
4. No hay validación de tipos de archivo por categoría

---

### 2.5 Grabación de Audio (GAP COMPLETO)

| Componente Frontend | Endpoint Backend | Estado | Gap Identificado |
|---------------------|------------------|--------|------------------|
| `AudioRecordingInterface` - subir audio | ❌ No existe | ❌ | Falta `POST /upload/audio` |
| Transcripción de audio | ❌ No existe | ❌ | Falta integración speech-to-text |
| Waveform data | N/A (frontend) | N/A | Procesamiento local |
| Audio streaming | ❌ No existe | ❌ | Falta WebSocket para audio streaming |

**GAPS CRÍTICOS:**
1. No hay endpoint para subir notas de voz
2. No hay transcripción automática
3. No hay preview/reproductor de audio en mensajes

---

### 2.6 Panel de Emojis (GAP COMPLETO)

| Componente Frontend | Endpoint Backend | Estado | Gap Identificado |
|---------------------|------------------|--------|------------------|
| `EmojiPanel` - Lista de emojis | N/A (frontend) | N/A | Puede usar librería local |
| `EmojiPanel` - Stickers | ❌ No existe | ❌ | Falta catálogo de stickers |
| `EmojiPanel` - GIFs | ❌ No existe | ❌ | Falta integración Giphy/Tenor |

**Notas:**
- Emojis Unicode pueden manejarse 100% en frontend
- Stickers personalizados requieren CRUD backend
- GIFs requieren integración con servicio externo

---

### 2.7 Selección de Mensajes (GAPS SIGNIFICATIVOS)

| Componente Frontend | Endpoint Backend | Estado | Gap Identificado |
|---------------------|------------------|--------|------------------|
| `MessageSelectionBar` - Reenviar | ❌ No existe | ❌ | Falta `POST /messages/forward` |
| `MessageSelectionBar` - Copiar | N/A (frontend) | N/A | Clipboard API local |
| `MessageSelectionBar` - Marcar (flag) | ❌ No existe | ❌ | Falta `PATCH /messages/:id/flag` |
| `MessageSelectionBar` - Descargar | ⚠️ Parcial | ⚠️ | Media URLs existen pero no hay endpoint batch |
| `MessageSelectionBar` - Eliminar | `DELETE /messages/:id` | ⚠️ | Existe pero no batch delete |

**Estado actual:**
```
DELETE /messages/:id  # Individual, no batch
```

**GAPS:**
1. No hay forward de mensajes
2. No hay flag/bookmark de mensajes
3. No hay batch delete
4. No hay batch download de media

---

### 2.8 WebSocket Events

| Evento | Dirección | Estado | Uso |
|--------|-----------|--------|-----|
| `subscribe` | Client → Server | ✅ | Subscribir a relationshipId |
| `unsubscribe` | Client → Server | ✅ | Desubscribir |
| `message` | Client → Server | ✅ | Enviar mensaje via WS |
| `ping` | Client → Server | ✅ | Keep-alive |
| `message:new` | Server → Client | ✅ | Nuevo mensaje recibido |
| `message:sent` | Server → Client | ✅ | Confirmación de envío |
| `extension:processed` | Server → Client | ✅ | Resultado de extensiones |
| `typing` | Bidireccional | ❌ | **GAP**: No hay indicador de escritura |

**GAPS WebSocket:**
1. No hay evento `typing` para indicador "escribiendo..."
2. No hay eventos de `read` para confirmación de lectura
3. No hay eventos de `presence` (online/offline)

---

## 3. GAPS CONSOLIDADOS POR PRIORIDAD

### 🔴 Prioridad ALTA (Funcionalidad Core del Wireframe)

| # | Gap | Componente Afectado | Acción Requerida |
|---|-----|---------------------|------------------|
| G-01 | Upload de archivos genérico | AttachmentPanel | Crear `POST /upload/file` con tipos |
| G-02 | Upload de audio/voz | AudioRecordingInterface | Crear `POST /upload/audio` |
| G-03 | Indicador "escribiendo" | ChatInputBar | Agregar WS event `typing` |
| G-04 | Forward de mensajes | MessageSelectionBar | Crear `POST /messages/forward` |
| G-05 | Eliminar múltiples mensajes | MessageSelectionBar | Crear `DELETE /messages/batch` |
| **G-15** | **Feedback IA (👍👎)** | **MessageHoverMenu** | **Crear `POST /messages/:id/feedback`** |
| **G-16** | **Refinación de mensajes IA** | **AIRefinementPanel** | **Crear `POST /messages/:id/refine`** |
| **G-17** | **Reacciones emoji** | **MessageHoverMenu** | **Crear `POST /messages/:id/reactions`** |

### 🟡 Prioridad MEDIA (Features Secundarias)

| # | Gap | Componente Afectado | Acción Requerida |
|---|-----|---------------------|------------------|
| G-06 | Flag/Bookmark mensajes | MessageSelectionBar | Agregar campo `flagged` a messages |
| G-07 | Compartir ubicación | AttachmentPanel | Crear endpoint ubicación |
| G-08 | Compartir contacto | AttachmentPanel | Crear endpoint contacto |
| G-09 | Read receipts | Mensajes | Agregar WS events `message:read` |
| G-10 | Presence (online/offline) | Header/Avatar | Agregar WS events `presence` |
| **G-18** | **Sistema de Tags (#)** | **ChatHeader** | **CRUD `POST /tags`, `POST /conversations/:id/tags`** |
| **G-19** | **Asignación de conversaciones (@)** | **ChatHeader** | **Crear `POST /conversations/:id/assign`** |
| **G-20** | **Búsqueda en conversación** | **ChatHeader** | **Crear `GET /conversations/:id/search`** |
| **G-21** | **Bloqueo de contactos** | **ChatOptionsMenu** | **Crear `POST /contacts/:id/block`** |

### 🟢 Prioridad BAJA (Nice-to-have)

| # | Gap | Componente Afectado | Acción Requerida |
|---|-----|---------------------|------------------|
| G-11 | Catálogo de stickers | EmojiPanel | CRUD stickers personalizados |
| G-12 | Integración GIFs | EmojiPanel | Integrar Giphy/Tenor API |
| G-13 | Quick replies CRUD | AttachmentPanel | CRUD respuestas rápidas |
| G-14 | Transcripción audio | AudioRecordingInterface | Integrar speech-to-text |
| **G-22** | **Export de conversación** | **ChatOptionsMenu** | **Crear `GET /conversations/:id/export`** |
| **G-23** | **Programar mensajes** | **ChatOptionsMenu** | **Crear `POST /messages/schedule`** |

---

## 4. ENDPOINTS SUGERIDOS PARA GAPS

### 4.1 Upload Genérico (G-01, G-02)

```typescript
// routes/upload.routes.ts - EXTENSIÓN PROPUESTA

POST /upload/file
  body: FormData {
    file: File,
    type: 'document' | 'image' | 'audio' | 'video',
    conversationId?: string  // Para asociar a mensaje
  }
  returns: {
    url: string,
    filename: string,
    mimeType: string,
    size: number,
    thumbnailUrl?: string  // Para imágenes/video
  }

POST /upload/audio
  body: FormData {
    file: File (audio/webm, audio/mp3, audio/ogg),
    duration: number,  // segundos
    conversationId?: string
  }
  returns: {
    url: string,
    duration: number,
    waveformData?: number[]  // Para visualización
  }
```

### 4.2 Typing Indicator (G-03)

```typescript
// WebSocket events nuevos

// Client → Server
{ type: 'typing:start', conversationId, accountId }
{ type: 'typing:stop', conversationId, accountId }

// Server → Client (broadcast a otros)
{ type: 'typing:update', conversationId, accountId, isTyping: boolean }
```

### 4.3 Message Actions (G-04, G-05, G-06)

```typescript
// routes/messages.routes.ts - EXTENSIONES PROPUESTAS

POST /messages/forward
  body: {
    messageIds: string[],
    targetConversationId: string,
    senderAccountId: string
  }
  returns: {
    forwardedMessages: Message[]
  }

DELETE /messages/batch
  body: {
    messageIds: string[]
  }
  returns: {
    deleted: number
  }

PATCH /messages/:id/flag
  body: {
    flagged: boolean,
    flagType?: 'important' | 'followup' | 'custom'
  }
  returns: Message
```

### 4.4 Location & Contact (G-07, G-08)

```typescript
// El schema MessageContent ya soporta location
// Solo necesita validación adicional

POST /messages
  body: {
    content: {
      text: string,
      location: {
        latitude: number,
        longitude: number,
        name?: string,
        address?: string
      }
    }
  }

// Para contactos, agregar al schema:
content: {
  text: string,
  contact: {
    name: string,
    phone?: string,
    email?: string,
    avatarUrl?: string
  }
}
```

---

## 5. ESQUEMA DE BASE DE DATOS - CAMBIOS SUGERIDOS

### 5.1 Tabla `messages` - Campos Adicionales

```sql
ALTER TABLE messages ADD COLUMN flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN flag_type TEXT;  -- 'important', 'followup', 'custom'
ALTER TABLE messages ADD COLUMN forwarded_from TEXT;  -- ID mensaje original
ALTER TABLE messages ADD COLUMN read_at TIMESTAMP;  -- Para read receipts
```

### 5.2 Nueva Tabla `media_attachments`

```sql
CREATE TABLE media_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  type TEXT NOT NULL,  -- 'image', 'document', 'audio', 'video', 'location', 'contact'
  url TEXT NOT NULL,
  filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  duration_seconds INTEGER,  -- Para audio/video
  thumbnail_url TEXT,
  metadata JSONB,  -- Datos adicionales específicos por tipo
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.3 Nueva Tabla `quick_replies`

```sql
CREATE TABLE quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,  -- Ej: "/thanks"
  category TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. PRÓXIMOS PASOS

1. **Auditar inventario** - Validar prioridades con stakeholders
2. **Crear tickets** para gaps de alta prioridad
3. **Diseñar migration** para cambios de schema
4. **Implementar endpoints** en orden de prioridad
5. **Actualizar frontend** conforme se completen endpoints

---

*Documento generado para FluxCoreChat - Análisis Backend-Frontend*
