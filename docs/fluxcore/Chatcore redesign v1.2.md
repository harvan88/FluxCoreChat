# ChatCore — Plan de Rediseño
**Versión:** 1.2  
**Estado:** Borrador para revisión arquitectónica  
**Alcance:** ChatCore únicamente — FluxCore no se modifica  
**Decisión clave:** Estamos en desarrollo sin datos de producción. Es el momento exacto para hacer esto bien.

---

## 1. Modelo de negocio

### 1.1 Las cuentas son simétricas

No existe distinción entre "operador" y "cliente". Toda cuenta en meetgar tiene el mismo tipo. Cada cuenta tiene lista de chats y perfil público (`meetgar.com/nombre-cuenta`). Una conversación entre Daniel y la peluquería aparece en la lista de ambos — es la misma relación vista desde cada lado.

### 1.2 El visitante anónimo NO es una cuenta

Hasta que inicia sesión, no existe como actor. Solo existe un `visitor_token` — identificador temporal en el navegador. No tiene PolicyContext, no tiene IA, no tiene perfil.

```
ANTES DEL LOGIN:
  visitor_token  ←→  peluquería-karen
  anonymous_thread — IA responde con políticas de la peluquería

DESPUÉS DEL LOGIN:
  daniel  ←→  peluquería-karen
  relationship real — mismo historial, identidad promovida
```

### 1.3 El perfil público como puerta de entrada

`meetgar.com/peluquería-karen` no es una bandeja especial. Es la puerta a la relación. Visitante anónimo → `anonymous_thread`. Visitante con sesión → relación existente o nueva.

---

## 2. El mensaje como evento semántico

### 2.1 Por qué importa esta decisión

Los sistemas actuales (WhatsApp Business, ManyChat) tratan el mensaje como un registro en una lista ordenada por timestamp. Eso limita estructuralmente lo que pueden hacer. No pueden responder a un mensaje específico. No pueden versionar. No pueden compartir un mensaje en un contexto diferente sin copiarlo.

Meetgar puede ser diferente desde el schema. El mensaje es un **evento causal** — sabe de dónde viene, qué tipo de evento es, y puede existir en múltiples contextos.

### 2.2 Lo que habilita este modelo

| Capacidad | Cómo se habilita | Por qué otros no lo tienen |
|---|---|---|
| Responder a un mensaje específico | `parent_id` | No tienen referencia causal |
| Editar con historial preservado | `original_id` + `version` | Sobreescriben el registro |
| La IA responde al mensaje #47, no al último | `parent_id` en el contexto | Solo leen los últimos N mensajes |
| Etiquetar mensajes (`urgente`, `cotización`) | `metadata JSONB` | Schema rígido |
| Compartir un mensaje en el perfil público | `metadata.visibility` | No tienen visibilidad por mensaje |
| Hilos internos entre operadores | `event_type: 'internal_note'` | No tienen tipos de evento |
| Reacciones, menciones | `event_type: 'reaction'` + `parent_id` | Feature separado, no nativo |

### 2.3 Schema propuesto para `messages`

```sql
-- Columnas a agregar a la tabla messages existente:
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'message'
    CHECK (event_type IN (
      'message',        -- mensaje de texto normal
      'reaction',       -- reacción a otro mensaje
      'edit',           -- versión editada
      'internal_note',  -- nota interna entre operadores (no visible al cliente)
      'system'          -- evento del sistema (ej. "conversación iniciada")
    )),
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES messages(id),
    -- threading: este mensaje responde a parent_id
    -- NULL = mensaje raíz

  ADD COLUMN IF NOT EXISTS original_id UUID REFERENCES messages(id),
    -- versiones: apunta al mensaje original que se editó
    -- NULL = es el original

  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    -- versión de este mensaje (1 = original, 2+ = edición)

  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true,
    -- false en versiones anteriores, true en la versión activa

  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    -- extensible: tags, visibility, mentions, shared_from, etc.

-- Índices para queries eficientes
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_original ON messages(original_id) WHERE original_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_event_type ON messages(event_type);
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata);
```

### 2.4 Ejemplos de uso del campo `metadata`

```json
// Mensaje visible en perfil público
{ "visibility": "public", "tags": ["promoción"] }

// Mensaje con menciones
{ "mentions": ["account_id_1", "account_id_2"] }

// Nota interna con etiqueta
{ "tags": ["urgente", "cotización"], "visibility": "internal" }

// Mensaje compartido desde otra conversación
{ "shared_from": { "conversation_id": "...", "message_id": "..." } }

// Reacción (event_type='reaction')
{ "emoji": "👍", "target_message_id": "..." }
```

### 2.5 Regla de inmutabilidad

Un mensaje nunca se edita en el lugar. Editar crea un nuevo registro:

```sql
-- Mensaje original:
id='msg_1', version=1, is_current=false, original_id=NULL

-- Versión editada:
id='msg_2', version=2, is_current=true, original_id='msg_1'
```

El historial completo siempre está disponible. La UI muestra `is_current=true`. FluxCore ve el historial completo para contexto.

---

## 3. Conversation Participants

### 3.1 Tabla nueva

```sql
CREATE TABLE conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  account_id      TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('initiator', 'recipient', 'observer')),
  identity_type   TEXT NOT NULL DEFAULT 'registered'
                  CHECK (identity_type IN ('registered', 'anonymous', 'system')),
  visitor_token   TEXT,
  subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  UNIQUE (conversation_id, account_id)
);

CREATE INDEX idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_account ON conversation_participants(account_id);
CREATE INDEX idx_conv_participants_token ON conversation_participants(visitor_token)
  WHERE visitor_token IS NOT NULL;
```

### 3.2 Cambio en `conversations`

```sql
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversation_type TEXT NOT NULL DEFAULT 'internal'
    CHECK (conversation_type IN ('internal', 'anonymous_thread', 'external'));
```

---

## 4. Flujos por escenario

### Escenario A — Dos cuentas registradas

```
Cuenta A inicia chat con Cuenta B
  → Validación: accountAId ≠ accountBId (hard fail)
  → INSERT relationships
  → INSERT conversations { conversation_type: 'internal' }
  → INSERT conversation_participants x2 (initiator + recipient)
```

PolicyContext: `recipient.account_id`. Ambos ven la conversación en su lista.

### Escenario B — Visitante anónimo (primera vez)

```
Visitante → meetgar.com/peluquería-karen
  → visitor_token generado en localStorage
  → Envía mensaje: senderAccountId=token, targetAccountId=peluquería

  → ChatProjector:
      → NO crear relationship
      → INSERT conversations { conversation_type: 'anonymous_thread' }
      → INSERT conversation_participants:
          { visitor_token, role:'initiator', identity_type:'anonymous' }
          { peluquería, role:'recipient', identity_type:'registered' }
      → cognition_queue: target_account_id = peluquería
```

### Escenario C — Visitante anónimo se registra

```
Login → { newAccountId, visitor_token }
  → UPDATE conversation_participants
      SET account_id=newAccountId, identity_type='registered', visitor_token=NULL
      WHERE visitor_token=:token

  → INSERT relationships (ahora hay dos cuentas reales)
  → UPDATE conversations SET conversation_type='internal', relationship_id=nuevo
```

### Escenario D — Widget externo (decisión v1)

Widget en `peluquería-karen.com` y perfil `meetgar.com/peluquería-karen` son canales separados en v1 (distinto localStorage = distinto visitor_token). Al registrarse, ambos hilos migran a la misma cuenta. Unificación cross-domain diferida a v2.

---

## 5. Lo que NO cambia en FluxCore

| Componente | Estado |
|---|---|
| Kernel, Journal, Signals | Sin cambios |
| CognitiveDispatcher | Sin cambios |
| RuntimeGateway | Sin cambios |
| ActionExecutor | Sin cambios |
| fluxcore_assistants | Sin cambios |
| fluxcore_account_policies | Sin cambios |

FluxCore consume `conversationId`, `accountId` y el historial de mensajes como strings/records. El schema de `messages` puede evolucionar siempre que los campos que FluxCore lee (`content`, `sender_account_id`, `generated_by`, `created_at`) sigan existiendo.

---

## 6. Validaciones críticas

```typescript
// relationship.service.ts — prevenir auto-relaciones
if (accountAId === accountBId) throw new Error('SELF_RELATIONSHIP_FORBIDDEN');

// ChatProjector — rechazar señales sin destinatario
if (!signal.targetAccountId) {
  console.error('[ChatProjector] ABORT: Signal without targetAccountId');
  return;
}

// CognitionWorker — usar siempre el destinatario para PolicyContext
accountId: entry.target_account_id ?? entry.account_id
```

---

## 7. Preguntas a resolver antes de codificar

1. ¿El widget embebido envía `targetAccountId` en la señal? ¿Dónde se inyecta?
2. ¿`conversationService.ensureConversation()` tiene otros call sites además de `messages.routes.ts`?
3. ¿El WebSocket broadcasting usa `conversations.account_id`? Ver `ws-handler.ts`.
4. ¿Hay tests que dependan de `conversations.account_id`?
5. **Decisión de producto:** ¿el `event_type: 'internal_note'` debe ser invisible para el participante anónimo/cliente desde el inicio, o lo dejamos para v2?

---

## 8. Orden de ejecución

### Fase 0 — Limpieza (hoy, sin rediseño)

```sql
-- Borrar auto-relaciones y datos en dev
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

### Fase 1 — Schema aditivo (una sola migración)

```sql
-- conversation_participants (§3.1)
-- conversation_type en conversations (§3.2)
-- event_type, parent_id, original_id, version, is_current, metadata en messages (§2.3)
```

Todo en una sola migración. Son columnas nuevas con defaults — no rompen nada existente.

### Fase 2 — Writers

- `ChatProjector`: usa `conversation_participants`, rechaza sin `targetAccountId`
- `relationship.service.ts`: validación + crea participantes
- `conversationService.ensureConversation()`: requiere `targetAccountId`

### Fase 3 — Readers

- WebSocket: broadcasting via `conversation_participants`
- Historial anónimo resuelto por `visitor_token`

### Fase 4 — Promoción de identidad

- Endpoint de migración `visitor_token → account_id`

### Fase 5 — Limpieza

- Deprecar `conversations.account_id`
- Eliminar `SyncManager` del chat activo

---

## 9. Script de migración Fase 1

```sql
-- Poblar conversation_participants para relaciones válidas existentes
INSERT INTO conversation_participants (conversation_id, account_id, role, identity_type)
SELECT c.id, r.account_a_id, 'initiator', 'registered'
FROM conversations c JOIN relationships r ON c.relationship_id = r.id
WHERE r.account_a_id != r.account_b_id
ON CONFLICT DO NOTHING;

INSERT INTO conversation_participants (conversation_id, account_id, role, identity_type)
SELECT c.id, r.account_b_id, 'recipient', 'registered'
FROM conversations c JOIN relationships r ON c.relationship_id = r.id
WHERE r.account_a_id != r.account_b_id
ON CONFLICT DO NOTHING;

-- messages existentes quedan con defaults correctos:
-- event_type='message', parent_id=NULL, version=1, is_current=true, metadata={}
```

---

*v1.2 — Agrega schema de messages como evento semántico. Es la decisión que diferencia el sistema. No implementar Fases 1-5 hasta resolver §7.*