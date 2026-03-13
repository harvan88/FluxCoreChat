# Hito COR-001: Integración ExtensionHost en MessageCore

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06  
> **Prioridad**: Alta (desbloquea procesamiento de extensiones)

## Resumen

Integración del `ExtensionHost` en el flujo de `MessageCore` para que las extensiones puedan procesar mensajes entrantes automáticamente.

---

## Problema Identificado

**Antes de COR-001:**
- `MessageCore.receive()` solo persistía y notificaba
- `ExtensionHost.processMessage()` existía pero NO era llamado
- Las extensiones instaladas no procesaban mensajes

**Resultado:** Las extensiones como `@fluxcore/fluxcore` estaban instaladas pero inactivas.

---

## Solución Implementada

### Flujo Actualizado de MessageCore.receive()

```
1. Recibir mensaje (envelope)
2. Persistir en base de datos
3. Actualizar metadatos de conversación
4. Actualizar lastInteraction en relationship
5. Notificar via WebSocket (message:new)
6. **NUEVO: Delegar a ExtensionHost.processMessage()** ← COR-001
7. Notificar resultados de extensiones (extension:processed)
8. Retornar resultado con extensionResults
```

### Cambios en Código

#### `apps/api/src/core/message-core.ts`

```typescript
// ANTES
async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
  // ... persistir, notificar
  return { success: true, messageId };
}

// DESPUÉS (COR-001)
async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
  // ... persistir, notificar
  
  // 5. DELEGAR A EXTENSIONHOST
  const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
  const targetAccountId = envelope.targetAccountId || 
    (envelope.senderAccountId === relationship.accountAId 
      ? relationship.accountBId 
      : relationship.accountAId);
  
  extensionResults = await extensionHost.processMessage({
    accountId: targetAccountId,
    relationshipId: conversation.relationshipId,
    conversationId: envelope.conversationId,
    message: {
      id: message.id,
      content: envelope.content,
      type: envelope.type,
      senderAccountId: envelope.senderAccountId,
    },
  });
  
  return { success: true, messageId, extensionResults };
}
```

---

## Interfaces Actualizadas

### MessageEnvelope

```typescript
export interface MessageEnvelope {
  id?: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: 'incoming' | 'outgoing' | 'system';
  generatedBy?: 'human' | 'ai';
  timestamp?: Date;
  targetAccountId?: string;  // NUEVO: Para extensiones
}
```

### ReceiveResult

```typescript
export interface ReceiveResult {
  success: boolean;
  messageId?: string;
  error?: string;
  extensionResults?: ProcessMessageResult[];  // NUEVO
}
```

---

## Determinación del Target Account

El `targetAccountId` es la cuenta que **RECIBE** el mensaje, no el sender:

| Sender | Relationship | Target |
|--------|--------------|--------|
| accountA | A ↔ B | accountB |
| accountB | A ↔ B | accountA |

Esto permite que las extensiones instaladas en la cuenta receptora procesen el mensaje entrante.

---

## Tests de Integración

### Archivo: `apps/api/src/__tests__/message-core-extension.test.ts`

| Test | Descripción |
|------|-------------|
| `should process message and delegate to ExtensionHost` | Verifica flujo completo |
| `should include extensionResults in response` | Verifica estructura de respuesta |
| `should correctly determine target account` | Verifica cálculo de targetAccountId |
| `should handle extension errors gracefully` | Verifica manejo de errores |
| `should update conversation metadata` | Verifica actualización de metadatos |
| `should verify ExtensionHost processMessage is called` | Verifica integración |

### Ejecutar Tests

```bash
# Requiere servidor corriendo
bun run api:start &
bun test apps/api/src/__tests__/message-core-extension.test.ts
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `apps/api/src/core/message-core.ts` | Integración con ExtensionHost |

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/__tests__/message-core-extension.test.ts` | Tests de integración |
| `docs/HITO_COR001_EXTENSIONHOST.md` | Esta documentación |

---

## Instrucciones para Pruebas Manuales

### Prerrequisitos

1. PostgreSQL corriendo con base de datos `fluxcore`
2. Servidor API corriendo en puerto 3000

### Pasos de Verificación

#### 1. Iniciar servidor

```bash
cd apps/api
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fluxcore bun run src/index.ts
```

#### 2. Crear usuario y cuentas

```bash
# Registrar usuario
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","username":"testuser"}'

# Guardar el token de la respuesta
TOKEN="<token_de_respuesta>"

# Crear cuenta sender
curl -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"sender1","displayName":"Sender","type":"personal"}'

# Crear cuenta receiver  
curl -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"receiver1","displayName":"Receiver","type":"business"}'
```

#### 3. Crear relación y conversación

```bash
# Crear relación (usar IDs de las cuentas creadas)
curl -X POST http://localhost:3000/relationships \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountAId":"<sender_id>","accountBId":"<receiver_id>"}'

# Crear conversación
curl -X POST http://localhost:3000/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"relationshipId":"<relationship_id>","channel":"web"}'
```

#### 4. Enviar mensaje y verificar procesamiento de extensiones

```bash
# Enviar mensaje
curl -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId":"<conversation_id>",
    "senderAccountId":"<sender_id>",
    "content":{"text":"Hola, prueba de COR-001","type":"text"},
    "type":"outgoing"
  }'
```

#### 5. Verificar respuesta

La respuesta debería incluir:

```json
{
  "id": "...",
  "conversationId": "...",
  "senderAccountId": "...",
  "content": {"text": "Hola, prueba de COR-001", "type": "text"},
  "type": "outgoing",
  "createdAt": "..."
}
```

#### 6. Verificar logs del servidor

En los logs del servidor debería aparecer:
- `[ExtensionHost] Processing message for account: <receiver_id>`
- Resultados de extensiones procesadas (si hay extensiones habilitadas)

---

## Checklist de Validación

- [x] `MessageCore` importa y usa `extensionHost`
- [x] `receive()` llama a `processMessage()` después de persistir
- [x] Se calcula correctamente el `targetAccountId`
- [x] Se notifica `extension:processed` vía WebSocket si hay acciones
- [x] `ReceiveResult` incluye `extensionResults`
- [x] Tests de integración creados
- [x] Documentación completa

---

## Próximos Pasos

Con COR-001 completado, las extensiones ahora pueden:

1. **Recibir mensajes** via `onMessage` callback
2. **Procesar contenido** y generar acciones
3. **Responder automáticamente** (ej: @fluxcore/fluxcore)

**Siguiente prioridad:** Implementar ejecución real de extensiones (cargar código de extensión y ejecutar `onMessage`).

---

**Última actualización**: 2025-12-06
