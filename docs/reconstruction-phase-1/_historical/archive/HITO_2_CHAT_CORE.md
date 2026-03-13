# Hito 2: Chat Core

## Resumen

Implementación completa del sistema de mensajería de FluxCore, incluyendo relaciones, conversaciones, mensajes y WebSocket para comunicación en tiempo real.

## Tareas Completadas

### FC-040: Schema SQL relationships ✅
- Tabla `relationships` con contexto unificado
- Perspectivas bilaterales (A y B)
- Context con entries y total_chars
- Límite de 2000 caracteres de contexto
- Tracking de última interacción

### FC-041: Schema SQL conversations ✅
- Tabla `conversations` vinculada a relationships
- Soporte para múltiples canales (web, whatsapp, telegram)
- Campos desnormalizados para performance (lastMessageAt, lastMessageText)
- Contadores de no leídos por perspectiva (unreadCountA, unreadCountB)
- Estados: active, archived, closed

### FC-042: Schema SQL messages ✅
- Tabla `messages` con contenido JSONB
- Soporte para texto, media, location, buttons
- Metadata de IA (generatedBy, aiApprovedBy)
- Vinculación a conversation y sender account

### FC-043: Schema SQL message_enrichments ✅
- Tabla para enriquecimientos de extensiones
- Vinculación a mensaje y extensión
- Payload JSONB flexible

### FC-044-049: Services y MessageCore ✅
- **RelationshipService**: CRUD de relaciones, gestión de contexto
- **ConversationService**: CRUD de conversaciones, contadores de no leídos
- **MessageService**: CRUD de mensajes
- **MessageCore**: Orquestador central de mensajería

### FC-050-051: Endpoints y WebSocket ✅
- HTTP endpoints para relationships, conversations, messages
- WebSocket para comunicación en tiempo real
- Subscripción a actualizaciones de relaciones
- Envío de mensajes via WebSocket

## Arquitectura

### MessageCore

El corazón del sistema de mensajería:

```typescript
class MessageCore {
  // Recibe y procesa mensajes
  async receive(envelope: MessageEnvelope): Promise<ReceiveResult>
  
  // Envía mensajes (alias de receive)
  async send(envelope: MessageEnvelope): Promise<ReceiveResult>
  
  // Obtiene historial
  async getHistory(conversationId: string, limit, offset)
  
  // Gestión de subscripciones WebSocket
  subscribe(relationshipId: string, callback)
  unsubscribe(relationshipId: string)
}
```

**Flujo de un mensaje:**
1. Recibe mensaje (HTTP o WebSocket)
2. Persiste en base de datos
3. Actualiza metadata de conversación
4. Actualiza última interacción en relationship
5. Broadcast via WebSocket a subscriptores

## API Endpoints

### Relationships

#### POST /relationships
Crea una relación entre dos cuentas.

**Request:**
```json
{
  "accountAId": "uuid",
  "accountBId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "accountAId": "uuid",
    "accountBId": "uuid",
    "perspectiveA": { "saved_name": null, "tags": [], "status": "active" },
    "perspectiveB": { "saved_name": null, "tags": [], "status": "active" },
    "context": { "entries": [], "total_chars": 0 },
    "createdAt": "2025-12-06T...",
    "lastInteraction": null
  }
}
```

#### GET /relationships
Lista todas las relaciones del usuario autenticado.

#### PATCH /relationships/:id/perspective
Actualiza la perspectiva de una cuenta en la relación.

**Request:**
```json
{
  "accountId": "uuid",
  "perspective": {
    "saved_name": "Mi amigo Juan",
    "tags": ["amigo", "trabajo"],
    "status": "active"
  }
}
```

#### POST /relationships/:id/context
Agrega una entrada al contexto compartido.

**Request:**
```json
{
  "authorAccountId": "uuid",
  "content": "Prefiere comunicación por la mañana",
  "type": "preference"
}
```

### Conversations

#### POST /conversations
Crea una conversación para una relación.

**Request:**
```json
{
  "relationshipId": "uuid",
  "channel": "web"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "relationshipId": "uuid",
    "channel": "web",
    "status": "active",
    "lastMessageAt": null,
    "lastMessageText": null,
    "unreadCountA": 0,
    "unreadCountB": 0,
    "createdAt": "2025-12-06T...",
    "updatedAt": "2025-12-06T..."
  }
}
```

#### GET /conversations/:id
Obtiene una conversación por ID.

#### GET /conversations/:id/messages
Obtiene los mensajes de una conversación.

**Query params:**
- `limit`: Número de mensajes (default: 50)
- `offset`: Offset para paginación (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "senderAccountId": "uuid",
      "content": {
        "text": "Hola, ¿cómo estás?",
        "media": [],
        "location": null,
        "buttons": null
      },
      "type": "outgoing",
      "generatedBy": "human",
      "aiApprovedBy": null,
      "createdAt": "2025-12-06T..."
    }
  ]
}
```

#### PATCH /conversations/:id
Actualiza el estado de una conversación.

**Request:**
```json
{
  "status": "archived"
}
```

### Messages

#### POST /messages
Envía un mensaje.

**Request:**
```json
{
  "conversationId": "uuid",
  "senderAccountId": "uuid",
  "content": {
    "text": "Hola, ¿cómo estás?",
    "media": [
      {
        "type": "image",
        "url": "https://example.com/image.jpg",
        "filename": "image.jpg"
      }
    ]
  },
  "type": "outgoing",
  "generatedBy": "human"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "uuid"
  }
}
```

#### GET /messages/:id
Obtiene un mensaje por ID.

## WebSocket

### Conexión

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Mensajes

#### Subscribe a una relación
```json
{
  "type": "subscribe",
  "relationshipId": "uuid"
}
```

**Response:**
```json
{
  "type": "subscribed",
  "relationshipId": "uuid"
}
```

#### Unsubscribe
```json
{
  "type": "unsubscribe",
  "relationshipId": "uuid"
}
```

#### Enviar mensaje
```json
{
  "type": "message",
  "conversationId": "uuid",
  "senderAccountId": "uuid",
  "content": {
    "text": "Hola desde WebSocket"
  }
}
```

**Response:**
```json
{
  "type": "message:sent",
  "messageId": "uuid"
}
```

#### Ping/Pong
```json
{
  "type": "ping"
}
```

**Response:**
```json
{
  "type": "pong",
  "timestamp": "2025-12-06T..."
}
```

#### Notificaciones de nuevos mensajes
Cuando llega un mensaje nuevo, todos los subscriptores reciben:

```json
{
  "event": "message:new",
  "data": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderAccountId": "uuid",
    "content": {
      "text": "Nuevo mensaje"
    },
    "type": "incoming",
    "generatedBy": "human",
    "createdAt": "2025-12-06T..."
  }
}
```

## Testing

### Script de Pruebas Automatizado

```bash
# 1. Asegúrate de que PostgreSQL esté corriendo
# 2. Aplica las migraciones
bun run packages/db/src/migrate.ts

# 3. Inicia el servidor
bun run dev

# 4. En otra terminal, ejecuta las pruebas
bun run apps/api/src/test-chat.ts
```

El script prueba:
1. ✅ Register User
2. ✅ Create Account 1
3. ✅ Create Account 2
4. ✅ Create Relationship
5. ✅ Add Context Entry
6. ✅ Create Conversation
7. ✅ Send Message
8. ✅ Get Messages

### Pruebas Manuales con cURL

#### 1. Registrar usuario y obtener token
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Guarda el token que recibes
TOKEN="tu-token-aqui"
```

#### 2. Crear dos cuentas
```bash
# Cuenta 1
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username":"user1","displayName":"User 1","accountType":"personal"}'

# Cuenta 2
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username":"user2","displayName":"User 2","accountType":"business"}'

# Guarda los IDs de las cuentas
ACCOUNT1="uuid-cuenta-1"
ACCOUNT2="uuid-cuenta-2"
```

#### 3. Crear relación
```bash
curl -X POST http://localhost:3000/relationships \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"accountAId\":\"$ACCOUNT1\",\"accountBId\":\"$ACCOUNT2\"}"

# Guarda el ID de la relación
RELATIONSHIP="uuid-relacion"
```

#### 4. Agregar contexto
```bash
curl -X POST http://localhost:3000/relationships/$RELATIONSHIP/context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"authorAccountId\":\"$ACCOUNT1\",\"content\":\"Prefiere comunicación formal\",\"type\":\"preference\"}"
```

#### 5. Crear conversación
```bash
curl -X POST http://localhost:3000/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"relationshipId\":\"$RELATIONSHIP\",\"channel\":\"web\"}"

# Guarda el ID de la conversación
CONVERSATION="uuid-conversacion"
```

#### 6. Enviar mensaje
```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"conversationId\":\"$CONVERSATION\",\"senderAccountId\":\"$ACCOUNT1\",\"content\":{\"text\":\"Hola, ¿cómo estás?\"},\"type\":\"outgoing\"}"
```

#### 7. Obtener mensajes
```bash
curl http://localhost:3000/conversations/$CONVERSATION/messages \
  -H "Authorization: Bearer $TOKEN"
```

### Pruebas con WebSocket (JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
  <title>FluxCore WebSocket Test</title>
</head>
<body>
  <h1>FluxCore WebSocket Test</h1>
  <div id="status">Disconnected</div>
  <div id="messages"></div>
  
  <script>
    const ws = new WebSocket('ws://localhost:3000/ws');
    const relationshipId = 'tu-relationship-id';
    
    ws.onopen = () => {
      document.getElementById('status').textContent = 'Connected';
      
      // Subscribe to relationship
      ws.send(JSON.stringify({
        type: 'subscribe',
        relationshipId: relationshipId
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);
      
      const messagesDiv = document.getElementById('messages');
      messagesDiv.innerHTML += `<p>${JSON.stringify(data)}</p>`;
    };
    
    ws.onclose = () => {
      document.getElementById('status').textContent = 'Disconnected';
    };
    
    // Send a test message after 2 seconds
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'message',
        conversationId: 'tu-conversation-id',
        senderAccountId: 'tu-account-id',
        content: {
          text: 'Test message from WebSocket'
        }
      }));
    }, 2000);
  </script>
</body>
</html>
```

## Base de Datos

### Migraciones

```bash
# Generar migraciones
cd packages/db
bun run db:generate

# Aplicar migraciones
bun run db:migrate

# Ver base de datos en Drizzle Studio
bun run db:studio
```

### Estructura de Tablas

```sql
-- relationships
CREATE TABLE relationships (
  id UUID PRIMARY KEY,
  account_a_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  account_b_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  perspective_a JSONB DEFAULT '{"saved_name":null,"tags":[],"status":"active"}',
  perspective_b JSONB DEFAULT '{"saved_name":null,"tags":[],"status":"active"}',
  context JSONB DEFAULT '{"entries":[],"total_chars":0}',
  created_at TIMESTAMP DEFAULT NOW(),
  last_interaction TIMESTAMP
);

-- conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
  channel VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  last_message_at TIMESTAMP,
  last_message_text VARCHAR(500),
  unread_count_a INTEGER DEFAULT 0,
  unread_count_b INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_account_id UUID REFERENCES accounts(id),
  content JSONB,
  type VARCHAR(20),
  generated_by VARCHAR(20) DEFAULT 'human',
  ai_approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- message_enrichments
CREATE TABLE message_enrichments (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  extension_id VARCHAR(100),
  type VARCHAR(50),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Características Clave

### Contexto Unificado
- Límite de 2000 caracteres compartidos
- Autoría por account
- Tipos: note, preference, rule
- Inmutable una vez creado (append-only)

### Perspectivas Bilaterales
- Cada cuenta tiene su propia vista de la relación
- saved_name: Nombre personalizado
- tags: Etiquetas personales
- status: active, blocked, archived

### Desnormalización Inteligente
- `lastMessageAt` y `lastMessageText` en conversations
- Contadores de no leídos por perspectiva
- Optimiza queries frecuentes

### Soporte Multi-Canal
- web, whatsapp, telegram
- Misma relación, múltiples conversaciones
- Preparado para adapters futuros

## Próximos Pasos

**Hito 3: Extensiones Core** (2 semanas)
- FC-070: Sistema de extensiones base
- FC-071: Extension manifest y permisos
- FC-072: @fluxcore/fluxcore (primera extensión)
- FC-073-089: Integración con Groq, UI de extensiones

## Notas Técnicas

### Decisiones de Diseño

1. **Contexto Unificado**: Simplifica la gestión y evita duplicación
2. **Perspectivas Separadas**: Privacidad y personalización por usuario
3. **JSONB para Contenido**: Flexibilidad para diferentes tipos de mensajes
4. **WebSocket**: Real-time sin polling
5. **MessageCore**: Punto único de entrada para todos los mensajes

### Limitaciones Conocidas

1. **WebSocket Reconnection**: No implementado (cliente debe reconectar)
2. **Message Delivery Confirmation**: No implementado
3. **Read Receipts**: No implementado
4. **Typing Indicators**: No implementado
5. **Message Reactions**: No implementado

### Performance

- Índices en: `relationships(account_a_id, account_b_id)`, `conversations(relationship_id)`, `messages(conversation_id)`
- Desnormalización reduce JOINs
- JSONB indexable para búsquedas futuras
- WebSocket evita polling constante

## Commits

- `48ba69f` - feat(db): add chat core schemas
- `62e1fc8` - feat(api): implement chat core with WebSocket

---

**Duración**: 2 semanas (estimado)
**Estado**: ✅ Completado
**Siguiente**: Hito 3 - Extensiones Core
