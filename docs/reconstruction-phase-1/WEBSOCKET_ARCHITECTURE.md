# Arquitectura WebSocket - FluxCoreChat

## Resumen General

FluxCoreChat utiliza una implementación WebSocket híbrida que combina el servidor WebSocket nativo de Bun con hooks de React para comunicación en tiempo real. El sistema soporta múltiples modos de autenticación, patrones de suscripción y tipos de mensajes para chat, sugerencias y eventos del sistema.

## Componentes de la Arquitectura

### 1. Lado del Servidor (`apps/api/src/`)

#### 1.1 Configuración del Servidor (`server.ts`)
```typescript
// Servidor híbrido: Elysia para HTTP + Bun nativo para WebSocket
interface WebSocketData {
  ip?: string;
  userAgent?: string;
  requestId?: string | null;
  accountId?: string | null;  // Cuenta activa para esta conexión
  userId?: string | null;    // ID del usuario propietario
}

let server: Server<WebSocketData>;
server = Bun.serve({
  fetch: async (req, server) => {
    // WebSocket upgrade en /ws
    if (url.pathname === '/ws') {
      // Extraer identidad del token JWT
      const identity = await resolveWebSocketIdentityFromToken(token, source);
      const success = server.upgrade(req, {
        data: {
          accountId: identity.accountId,
          userId: identity.userId,
          // ... metadatos
        }
      });
    }
  },
  websocket: {
    message: handleWSMessage,
    open: handleWSOpen,
    close: handleWSClose,
  },
});
```

#### 1.2 Resolución de Identidad (`server.ts`)
```typescript
async function resolveWebSocketIdentityFromToken(token: string, source: string): Promise<{ accountId: string | null; userId: string | null }> {
  const payload = JSON.parse(atob(token.split('.')[1]));
  
  if (payload.type === 'public_profile') {
    return { accountId: payload.ownerAccountId, userId: null };
  }
  
  const userId = payload.userId || payload.sub;
  const userAccounts = await db.select().from(accounts)
    .where(eq(accounts.ownerUserId, userId)).limit(1);
  
  return { accountId: userAccounts[0]?.id, userId };
}
```

#### 1.3 Manejador WebSocket (`websocket/ws-handler.ts`)

**Gestión de Conexiones:**
```typescript
// Almacenamiento de suscripciones
const relationshipSubscriptions = new Map<string, Set<any>>();
const conversationSubscriptions = new Map<string, Set<any>>();
const visitorSubscriptions = new Map<string, Set<any>>();
const activeConnections = new Set<any>();

export function handleWSOpen(ws: any): void {
  console.log('[ws-handler] Conexión WebSocket abierta');
  console.log('[ws-handler] ws.data:', ws.data);
  activeConnections.add(ws);
  
  ws.send(JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString()
  }));
}
```

**Tipos de Mensajes:**
```typescript
interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'message' | 'ping' | 
        'request_suggestion' | 'approve_suggestion' | 'discard_suggestion' |
        'user_activity' | 'widget:connect' | 'widget:message';
  relationshipId?: string;
  conversationId?: string;
  content?: any;
  senderAccountId?: string;
  accountId?: string;
  suggestionId?: string;
  suggestedText?: string;
  messageId?: string;
  createdAt?: string;
  activity?: 'typing' | 'recording' | 'idle' | 'cancel';
  // Específico de Widget
  alias?: string;
  visitorToken?: string;
}
```

**Gestión de Suscripciones:**
```typescript
// Suscribirse a relationship/conversation
case 'subscribe':
  if (data.relationshipId) {
    relationshipSubscriptions.get(data.relationshipId)?.add(ws);
    messageCore.subscribeToRelationship(data.relationshipId, callback);
  }
  if (data.conversationId) {
    conversationSubscriptions.get(data.conversationId)?.add(ws);
    messageCore.subscribeToConversation(data.conversationId, callback);
  }
  break;
```

**Difusión con Autorización:**
```typescript
export function broadcastToRelationship(relationshipId: string, payload: any): void {
  const subs = relationshipSubscriptions.get(relationshipId);
  if (subs) {
    for (const ws of subs) {
      const wsAccountId = ws.data?.accountId;
      const messageSenderId = payload.data?.senderAccountId;
      const messageTargetId = payload.data?.targetAccountId;
      
      // Modo compatibilidad para conexiones sin accountId
      if (!wsAccountId) {
        console.log(`[WebSocket] 🔄 No accountId en ws.data, enviando a todos (compatibilidad)`);
        ws.send(JSON.stringify(payload));
        continue;
      }
      
      // Lógica de autorización: Enviar solo si:
      // 1. Es un mensaje de IA (broadcast a todos), O
      // 2. WebSocket pertenece al remitente del mensaje, O
      // 3. WebSocket pertenece al destinatario del mensaje
      const isAIMessage = payload.data?.generatedBy === 'ai';
      const isSender = wsAccountId === messageSenderId;
      const isRecipient = wsAccountId === messageTargetId;
      
      if (isAIMessage || isSender || isRecipient) {
        ws.send(JSON.stringify(payload));
      } else {
        console.log(`[WebSocket] 🚫 Filtrando mensaje para ${wsAccountId}: no autorizado`);
      }
    }
  }
}
```

### 2. Lado del Cliente (`apps/web/src/`)

#### 2.1 Hook useWebSocket (`hooks/useWebSocket.ts`)

**Configuración:**
```typescript
interface UseWebSocketOptions {
  onMessage?: (message: WSMessage) => void;
  onSuggestion?: (suggestion: AISuggestion) => void;
  onActivityState?: (payload: { accountId: string; conversationId: string; activity: string }) => void;
  autoConnect?: boolean;
  accountIdOverride?: string | null;
  authTokenOverride?: string | null;
  includeSelectedAccountId?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  pingInterval?: number;
}
```

**Lógica de Conexión:**
```typescript
const connect = useCallback(() => {
  const token = effectiveAuthTokenRef.current;
  const acctId = effectiveAccountIdRef.current;
  
  let wsUrl = WS_URL;
  const params = new URLSearchParams();
  
  if (token) params.append('token', token);
  if (acctId) params.append('accountId', acctId);
  
  if (params.toString()) {
    wsUrl = `${WS_URL}?${params.toString()}`;
  }
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    setStatus('connected');
    // Resuscribirse a relationships/conversations anteriores
    subscribedRelationshipsRef.current.forEach(relationshipId => {
      ws.send(JSON.stringify({ type: 'subscribe', relationshipId }));
    });
  };
  
  ws.onclose = (event) => {
    if (reconnect && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
      // Backoff exponencial con jitter
      const delay = Math.min(baseDelay + jitter, 30000);
      setTimeout(() => connect(), delay);
    }
  };
}, [clearReconnectTimeout, reconnect, reconnectInterval]);
```

**Optimizaciones de Estabilidad:**
```typescript
// Refs para valores de conexión (evita recrear connect en cada cambio)
const effectiveAccountIdRef = useRef(effectiveAccountId);
effectiveAccountIdRef.current = effectiveAccountId;
const effectiveAuthTokenRef = useRef(effectiveAuthToken);
effectiveAuthTokenRef.current = effectiveAuthToken;

// Callbacks estables con refs
const callbacksRef = useRef({
  onMessage, onSuggestion, onActivityState, // ...
});
```

#### 2.2 WebSocket de Perfil Público (`public-profile/hooks/usePublicChat.ts`)

**Protocolo de Widget:**
```typescript
const connectWebSocket = useCallback(() => {
  // Autenticado: pasar token
  const wsUrl = isAuthenticated && token
    ? `${WS_URL}?token=${encodeURIComponent(token)}`
    : WS_URL;
  
  ws.onopen = () => {
    if (isAuthenticated && activeAccountId) {
      // Protocolo de suscripción normal
      ws.send(JSON.stringify({
        type: 'subscribe',
        conversationId: conversationIdRef.current,
      }));
    } else {
      // Protocolo de widget anónimo
      ws.send(JSON.stringify({
        type: 'widget:connect',
        alias,
        visitorToken,
      }));
    }
  };
}, [alias, visitorToken, isAuthenticated, activeAccountId]);
```

## Authentication Modes

### 1. Authenticated Users (JWT Token)
- **Source**: `localStorage.getItem('fluxcore_token')`
- **Format**: Bearer JWT in header or query param
- **Token Payload**:
  ```json
  {
    "userId": "user-uuid",
    "sub": "user-uuid",
    "exp": 1234567890
  }
  ```
- **Resolution**: Token → userId → first account.id → ws.data.accountId + ws.data.userId

### 2. Public Profile Token
- **Source**: Generated by public profile endpoint
- **Format**: JWT with `type: 'public_profile'`
- **Token Payload**:
  ```json
  {
    "type": "public_profile",
    "ownerAccountId": "account-uuid",
    "visitorToken": "visitor-token",
    "exp": 1234567890
  }
  ```
- **Resolution**: Direct mapping to ws.data.accountId, userId = null

### 3. Selected Account Override
- **Source**: URL query parameter `?accountId=xxx`
- **Priority**: Overrides token-resolved accountId
- **Use Case**: User switches active account in UI

## Message Flow Patterns

### 1. Chat Messages
```
Client (sendMessage) → WS → handleWSMessage → messageCore.send() → 
messageCore.receive() → broadcastToConversation() → All subscribed clients
```

**Client Send:**
```typescript
sendMessage({
  conversationId: 'conv-123',
  senderAccountId: 'acc-456',
  content: { text: 'Hello' }
});
```

**Server Broadcast:**
```typescript
case 'message':
  // 🛡️ CHATCORE GATEWAY: Certify Ingress (Reality Adapter)
  // Validate that it's a human communication attempt
  const wsData = ws.data || {};
  
  // 🔥 NEW: Validate active account of the user
  const { accountActivationService } = await import('../services/account-activation.service');
  const userValidation = await accountActivationService.validateSenderAccount(
    wsData.userId, // Authenticated user from WebSocket
    data.senderAccountId
  );
  
  if (!userValidation.isValid) {
    ws.send(JSON.stringify({
      type: 'error',
      message: userValidation.reason,
      code: 'ACCOUNT_NOT_AUTHORIZED'
    }));
    return;
  }
  
  // 🔥 NEW: Validate that sender is a conversation participant
  const { conversationParticipantService } = await import('../services/conversation-participant.service');
  const participants = await conversationParticipantService.getActiveParticipants(data.conversationId);
  
  const isParticipant = participants.some(p => 
    p.accountId === data.senderAccountId || 
    (p.visitorToken && data.visitorToken === p.visitorToken)
  );
  
  // 🔥 NEW: Allow if it's an account from the same user (same owner)
  let isSameUserAccount = false;
  if (!isParticipant) {
    const senderAccountInfo = await db
      .select({ ownerUserId: accounts.ownerUserId })
      .from(accounts)
      .where(eq(accounts.id, data.senderAccountId))
      .limit(1);
    
    const participantOwners = await db
      .select({ ownerUserId: accounts.ownerUserId })
      .from(accounts)
      .where(inArray(accounts.id, participants.map(p => p.accountId).filter((id): id is string => !!id)));
    
    const senderOwnerId = senderAccountInfo[0]?.ownerUserId;
    isSameUserAccount = participantOwners.some(p => p.ownerUserId === senderOwnerId);
  }
  
  if (!isParticipant && !isSameUserAccount) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      code: 'NOT_PARTICIPANT',
      message: 'No eres participante de esta conversación' 
    }));
    return;
  }
  
  // Send via messageCore
  chatCoreGateway.certifyIngress({
    accountId: data.senderAccountId,
    userId: senderAccount[0]?.ownerUserId || data.senderAccountId,
    payload: data.content,
    meta: { /* ... */ }
  }).then((certification) => {
    if (certification.accepted) {
      resolveActorId(data.senderAccountId!).then(actorId => messageCore.send({
        conversationId: data.conversationId!,
        senderAccountId: data.senderAccountId!,
        fromActorId: actorId || undefined,
        content: data.content!,
        type: 'outgoing',
        generatedBy: 'human',
      }));
    }
  });
```

### 2. AI Suggestions
```
Client (requestSuggestion) → WS → handleWSMessage → extensionHost → 
AI Service → broadcastToConversation() → Client (onSuggestion)
```

**Request:**
```typescript
requestSuggestion({
  conversationId: 'conv-123',
  accountId: 'acc-456',
  relationshipId: 'rel-789'
});
```

**Response Types:**
- `suggestion:generating` - AI is thinking
- `suggestion:ready` - Suggestion ready
- `suggestion:auto_waiting` - Auto-delay before typing
- `suggestion:auto_typing` - AI is typing
- `suggestion:auto_sending` - Sending message
- `suggestion:auto_cancelled` - Cancelled

### 3. User Activity (Typing Indicators)
```
Client (reportActivity) → WS → handleWSMessage → 
messageCore.broadcastActivity() → broadcastToConversation() → All clients
```

**Activity Report:**
```typescript
reportActivity({
  conversationId: 'conv-123',
  accountId: 'acc-456',
  activity: 'typing' // | 'recording' | 'idle' | 'cancel'
});
```

### 4. Widget/Public Profile
```
Anonymous Client → WS → handleWSMessage → 
chatCoreWebchatGateway → broadcastToVisitor() → Widget clients
```

**Connect:**
```typescript
{
  type: 'widget:connect',
  alias: 'profile-alias',
  visitorToken: 'visitor-token-123'
}
```

**Message:**
```typescript
{
  type: 'widget:message',
  alias: 'profile-alias',
  visitorToken: 'visitor-token-123',
  content: { text: 'Hello from visitor' }
}
```

**Widget Message Handling:**
```typescript
case 'widget:message':
  if (data.alias && (data.visitorToken || data.visitorId) && data.content) {
    handleWidgetMessage(ws, data);
  }
```

**Widget Connect Handler:**
```typescript
async function handleWidgetConnect(ws: any, data: WSMessage): Promise<void> {
  const { alias, visitorToken, visitorId } = data;
  
  // Validate alias exists and is active
  const profile = await getPublicProfileByAlias(alias);
  if (!profile || !profile.isActive) {
    ws.send(JSON.stringify({
      type: 'widget:error',
      message: 'Profile not found or inactive'
    }));
    return;
  }
  
  // Create or retrieve visitor actor
  const visitorActor = await resolveOrCreateVisitorActor(visitorToken, alias);
  
  // Add to visitor subscriptions
  if (!visitorSubscriptions.has(visitorToken)) {
    visitorSubscriptions.set(visitorToken, new Set());
  }
  visitorSubscriptions.get(visitorToken)!.add(ws);
  
  // Store visitor info on WebSocket
  ws.visitorToken = visitorToken;
  ws.visitorActorId = visitorActor.id;
  ws.profileAccountId = profile.id;
  
  ws.send(JSON.stringify({
    type: 'widget:connected',
    accountId: profile.id,
    visitorActorId: visitorActor.id
  }));
}
```

## Subscription Model

### 1. Relationship-Level Subscriptions
- **Scope**: All conversations in a relationship
- **Use Case**: Real-time updates across all conversations with a contact
- **Implementation**: `messageCore.subscribeToRelationship()`

### 2. Conversation-Level Subscriptions
- **Scope**: Single conversation
- **Use Case**: Chat view, typing indicators, message updates
- **Implementation**: `messageCore.subscribeToConversation()`

### 3. Visitor Subscriptions
- **Scope**: Widget sessions by visitor token
- **Use Case**: Anonymous chat widgets
- **Implementation**: `visitorSubscriptions` Map

## Connection Lifecycle

### 1. Connection Establishment
```
1. Client constructs WebSocket URL with token + accountId
2. Server extracts identity via resolveWebSocketIdentityFromToken()
3. Server.upgrade() creates ws.data with accountId + userId
4. handleWSOpen() adds connection to activeConnections
5. Server sends 'connected' message
6. Client re-subscribes to previous subscriptions
```

### 2. Message Processing
```
1. Client sends JSON message
2. handleWSMessage() parses and routes by type
3. Authorization checks (ws.data.accountId vs message sender/target)
4. Business logic (messageCore, extensionHost, etc.)
5. Broadcasting to relevant subscribers
6. Client receives and processes via callbacks
```

### 3. Connection Cleanup
```
1. WebSocket closes (client disconnect, network issue)
2. handleWSClose() removes from activeConnections
3. Cleanup all subscription maps
4. Unsubscribe from messageCore callbacks
5. Client attempts reconnection (if enabled)
```

**handleWSClose Implementation:**
```typescript
export function handleWSClose(ws: any): void {
  console.log('[WebSocket] Connection closed - Code:', ws.readyState, 'Reason:', ws.reason);
  
  // Remove from active connections
  activeConnections.delete(ws);
  
  // Cleanup relationship subscriptions
  for (const [relationshipId, subs] of relationshipSubscriptions.entries()) {
    if (subs.has(ws)) {
      subs.delete(ws);
      if (subs.size === 0) {
        relationshipSubscriptions.delete(relationshipId);
        messageCore.unsubscribeFromRelationship(relationshipId);
      }
    }
  }
  
  // Cleanup conversation subscriptions
  for (const [conversationId, subs] of conversationSubscriptions.entries()) {
    if (subs.has(ws)) {
      subs.delete(ws);
      if (subs.size === 0) {
        conversationSubscriptions.delete(conversationId);
      }
    }
  }
  
  // Cleanup conversation callbacks
  if (ws.__conversationCallbacks) {
    for (const [conversationId, callback] of ws.__conversationCallbacks.entries()) {
      messageCore.unsubscribeFromConversation(conversationId, callback);
    }
    ws.__conversationCallbacks.clear();
  }
  
  // Cleanup visitor subscriptions
  for (const [token, subs] of visitorSubscriptions.entries()) {
    if (subs.has(ws)) {
      subs.delete(ws);
      if (subs.size === 0) {
        visitorSubscriptions.delete(token);
      }
    }
  }
}
```

## Error Handling & Reconnection

### 1. Reconnection Strategy
- **Max Attempts**: 5
- **Backoff**: Exponential with 30% jitter
- **Base Delay**: 3000ms
- **Max Delay**: 30 seconds

```typescript
const baseDelay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
const jitter = Math.random() * 0.3 * baseDelay;
const delay = Math.min(baseDelay + jitter, 30000);
```

### 2. Connection States
```typescript
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
```

### 3. Common Error Codes
- **1006**: Abnormal closure (network issue)
- **1000**: Normal closure
- **1001**: Going away
- **4266**: Reserved (should not be used)

**Client Error Handling:**
```typescript
ws.onclose = (event) => {
  if (!mountedRef.current) return;
  console.log('[WebSocket] Disconnected:', event.code, event.reason);
  setStatus('disconnected');
  setLastError(`WebSocket cerrado (${event.code})${event.reason ? `: ${event.reason}` : ''}`);
  wsRef.current = null;

  if (manualDisconnectRef.current) {
    return; // Don't reconnect if manually disconnected
  }
  
  if (reconnect && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttemptsRef.current++;
    setReconnectAttempts(reconnectAttemptsRef.current);
    
    const delay = calculateBackoff();
    console.log(`[WebSocket] 🔄 Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, delay);
  } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[WebSocket] ⚠️ Max reconnect attempts reached. Giving up.');
    setStatus('error');
    setLastError('WebSocket: máximo de reintentos alcanzado');
  }
};

ws.onerror = () => {
  if (!mountedRef.current) return;
  // Only log on first error to avoid spam during reconnection
  if (reconnectAttemptsRef.current === 0) {
    console.warn('[WebSocket] Connection error (will retry)');
  }
  setLastError('WebSocket: error de conexión');
};
```

## Performance Optimizations

### 1. Callback Stabilization
```typescript
// Use refs instead of closing over changing values
const effectiveAccountIdRef = useRef(effectiveAccountId);
effectiveAccountIdRef.current = effectiveAccountId;

// Stable connect callback
const connect = useCallback(() => {
  const acctId = effectiveAccountIdRef.current; // Read from ref
  // ...
}, [clearReconnectTimeout, reconnect, reconnectInterval]); // No effectiveAccountId dep
```

### 2. Subscription Persistence
```typescript
// Store subscriptions in refs for reconnection
const subscribedRelationshipsRef = useRef<Set<string>>(new Set());
const subscribedConversationsRef = useRef<Set<string>>(new Set());

// Re-subscribe on reconnection
ws.onopen = () => {
  subscribedRelationshipsRef.current.forEach(relationshipId => {
    ws.send(JSON.stringify({ type: 'subscribe', relationshipId }));
  });
};
```

### 3. Broadcast Authorization
```typescript
// Only send to authorized recipients
const wsAccountId = ws.data?.accountId;
if (!wsAccountId || 
    wsAccountId === messageSenderId || 
    wsAccountId === messageTargetId) {
  ws.send(JSON.stringify(payload));
}
```

### 4. Ping/Pong Keep-Alive
```typescript
// Server-side ping handler
case 'ping':
  ws.send(JSON.stringify({
    type: 'pong',
    timestamp: new Date().toISOString()
  }));
  break;

// Client-side periodic ping
useEffect(() => {
  if (status !== 'connected') return;

  const interval = setInterval(() => {
    ping(); // Send ping every 30 seconds
  }, pingInterval);

  return () => clearInterval(interval);
}, [status, ping, pingInterval]);

// Client ping implementation
const ping = useCallback(() => {
  return send({ type: 'ping' });
}, [send]);
```

## Debugging & Monitoring

### 1. Server Logs
```
[WebSocket] Upgrade request received
[WebSocket] Headers: {...}
[WebSocket] 🎯 Using selected accountId from frontend: acc-123
[ws-handler] WebSocket connection opened
[ws-handler] 📋 ws.data: { accountId: 'acc-123', userId: 'user-456' }
[ws-handler] Active connections: 1
```

### 2. Client Logs
```
[WebSocket] Connecting to: ws://localhost:3000/ws
[WebSocket] 🎯 Token available: true
[WebSocket] 🎯 Effective accountId for WebSocket: acc-123
[WebSocket] Connected
[useWebSocket] Status changed to: connected
```

### 3. Message Flow Tracing
```
[DEBUG] Sending activity via WebSocket: { accountId: 'acc-123', conversationId: 'conv-456', activity: 'typing' }
[WebSocket] 🔍 Broadcasting to 2 subscribers in relationship rel-789
[WebSocket] 🔍 Checking WS: accountId=acc-123, sender=acc-123, target=acc-789
[WebSocket] 🎯 Decision: isAI=false, isSender=true, isRecipient=false
[WebSocket] ✅ Sending to acc-123: sender=acc-123, target=acc-789, isAI=false
```

**Detailed Message Tracing:**
```typescript
// Client-side debugging
const reportActivity = useCallback((params) => {
  console.log('[DEBUG] Sending activity via WebSocket:', params);
  return send({ type: 'user_activity', ...params });
}, [send]);

// Server-side debugging
console.log(`[WebSocket] 🔍 Broadcasting to ${subs.size} subscribers in relationship ${relationshipId}`);
console.log(`[WebSocket] 📋 Payload:`, {
  senderAccountId: payload.data?.senderAccountId,
  targetAccountId: payload.data?.targetAccountId,
  generatedBy: payload.data?.generatedBy,
  messageId: payload.data?.id
});

console.log(`[WebSocket] 🔍 Checking WS: accountId=${wsAccountId}, sender=${messageSenderId}, target=${messageTargetId}`);
console.log(`[WebSocket] 🎯 Decision: isAI=${isAIMessage}, isSender=${isSender}, isRecipient=${isRecipient}`);
```

## Security Considerations

### 1. Token Validation
- JWT signature verification (handled by auth middleware)
- Token expiration checks
- Account ownership validation

### 2. Message Authorization
- Sender must own the account they're sending from
- Recipients must be participants in the conversation
- Visitor tokens limited to specific conversations

**Account Validation Implementation:**
```typescript
// Validate sender account ownership
const { accountActivationService } = await import('../services/account-activation.service');
const userValidation = await accountActivationService.validateSenderAccount(
  wsData.userId, // Authenticated user from WebSocket
  data.senderAccountId
);

if (!userValidation.isValid) {
  ws.send(JSON.stringify({
    type: 'error',
    message: userValidation.reason,
    code: 'ACCOUNT_NOT_AUTHORIZED'
  }));
  return;
}
```

**Participant Validation Implementation:**
```typescript
// Validate conversation participation
const { conversationParticipantService } = await import('../services/conversation-participant.service');
const participants = await conversationParticipantService.getActiveParticipants(data.conversationId);

const isParticipant = participants.some(p => 
  p.accountId === data.senderAccountId || 
  (p.visitorToken && data.visitorToken === p.visitorToken)
);

// Allow if it's an account from the same user (same owner)
let isSameUserAccount = false;
if (!isParticipant) {
  const senderOwnerId = (await db.select({ ownerUserId: accounts.ownerUserId })
    .from(accounts)
    .where(eq(accounts.id, data.senderAccountId))
    .limit(1))[0]?.ownerUserId;
    
  isSameUserAccount = participantOwners.some(p => p.ownerUserId === senderOwnerId);
}

if (!isParticipant && !isSameUserAccount) {
  ws.send(JSON.stringify({ 
    type: 'error', 
    code: 'NOT_PARTICIPANT',
    message: 'No eres participante de esta conversación' 
  }));
  return;
}
```

### 3. Subscription Authorization
- Users only receive messages for conversations they're subscribed to
- Account switching updates subscriptions appropriately
- Visitor isolation by visitorToken

**Broadcast Authorization Logic:**
```typescript
// Authorization logic: Send only if:
// 1. It's an AI message (broadcast to all), OR
// 2. WebSocket belongs to message sender, OR
// 3. WebSocket belongs to message target
const isAIMessage = payload.data?.generatedBy === 'ai';
const isSender = wsAccountId === messageSenderId;
const isRecipient = wsAccountId === messageTargetId;

if (isAIMessage || isSender || isRecipient) {
  ws.send(JSON.stringify(payload));
} else {
  console.log(`[WebSocket] 🚫 Filtering message for ${wsAccountId}: not authorized`);
}
```

## Configuration

### Environment Variables
```bash
VITE_WS_URL=ws://localhost:3000/ws  # Client WebSocket URL
HOST=0.0.0.0                         # Server bind address
PORT=3000                           # Server port
```

### Client Options
```typescript
const wsOptions = {
  autoConnect: true,           // Auto-connect on mount
  reconnect: true,             // Enable reconnection
  reconnectInterval: 3000,     // Base reconnection delay
  pingInterval: 30000,         // Keep-alive ping interval
  includeSelectedAccountId: true, // Use UI store accountId
};
```

## Troubleshooting Guide

### 1. Connection Issues

#### 1006 Errors (Abnormal Closure)
**Symptoms**: WebSocket disconnects immediately after connecting
**Causes**:
- Server failed to start (port conflict)
- Network connectivity issues
- WebSocket upgrade failure

**Solutions**:
```bash
# Check if port 3000 is in use
netstat -an | findstr :3000

# Kill stale process
taskkill /PID <PID> /F

# Restart dev server
bun run dev
```

**Server Logs to Check**:
```
[WebSocket] Upgrade request received
[WebSocket] 🎯 Using selected accountId from frontend: acc-123
[ws-handler] WebSocket connection opened
[ws-handler] 📋 ws.data: { accountId: 'acc-123', userId: 'user-456' }
```

#### Authentication Failures
**Symptoms**: Connection rejected or unauthorized messages
**Causes**:
- Invalid JWT token
- Token expired
- Account ownership mismatch

**Debug Steps**:
```javascript
// Check token in browser console
const token = localStorage.getItem('fluxcore_token');
console.log('Token:', token);
console.log('Decoded:', JSON.parse(atob(token.split('.')[1])));

// Verify accountId resolution
console.log('Selected accountId:', useUIStore.getState().selectedAccountId);
```

#### Account Switching Issues
**Symptoms**: Messages sent with wrong account after switching
**Causes**: Stale accountId in WebSocket connection
**Solutions**: The hook automatically reconnects when accountId changes

### 2. Message Delivery Issues

#### Missing Messages
**Symptoms**: Messages not appearing for some participants
**Debug Steps**:
```typescript
// Check subscription state
console.log('Subscribed relationships:', Array.from(subscribedRelationshipsRef.current));
console.log('Subscribed conversations:', Array.from(subscribedConversationsRef.current));

// Check server authorization
[WebSocket] 🔍 Checking WS: accountId=acc-123, sender=acc-456, target=acc-789
[WebSocket] 🎯 Decision: isAI=false, isSender=false, isRecipient=true
[WebSocket] ✅ Sending to acc-123: sender=acc-456, target=acc-789, isAI=false
```

#### Wrong Recipients
**Symptoms**: Messages delivered to unauthorized users
**Causes**: Missing accountId in ws.data (compatibility mode)
**Solutions**: Ensure all WebSocket connections have proper accountId

#### Duplicate Messages
**Symptoms**: Same message appearing multiple times
**Causes**: Multiple WebSocket connections, duplicate subscriptions
**Solutions**: Close old connections before opening new ones

### 3. Performance Issues

#### High Reconnection Rate
**Symptoms**: Constant reconnection attempts
**Debug Steps**:
```typescript
// Check reconnection state
console.log('Reconnect attempts:', reconnectAttempts);
console.log('Connection status:', status);
console.log('Last error:', lastError);
```

**Solutions**:
- Check network stability
- Verify server health
- Reduce reconnection frequency

#### Memory Leaks
**Symptoms**: Increasing memory usage over time
**Debug Steps**:
```typescript
// Monitor subscription maps
console.log('Active connections:', activeConnections.size);
console.log('Relationship subscriptions:', relationshipSubscriptions.size);
console.log('Conversation subscriptions:', conversationSubscriptions.size);
```

**Solutions**: Ensure proper cleanup in handleWSClose

#### CPU Spikes
**Symptoms**: High CPU during message broadcasting
**Causes**: Inefficient authorization checks, large message payloads
**Solutions**: Optimize broadcast logic, implement message compression

### 4. Common Debug Patterns

#### WebSocket Connection Debug
```typescript
// Client-side
console.log('[WebSocket] Connecting to:', wsUrl);
console.log('[WebSocket] 🎯 Token available:', !!token);
console.log('[WebSocket] 🎯 Effective accountId:', acctId);

// Server-side
console.log('[ws-handler] WebSocket connection opened');
console.log('[ws-handler] 📋 ws.data:', ws.data);
console.log('[ws-handler] 🎯 ws.data.accountId:', ws.data?.accountId);
```

#### Message Flow Debug
```typescript
// Client send
console.log('[DEBUG] Sending activity via WebSocket:', params);

// Server receive
console.log('[ws-handler] Received message type:', data.type);
console.log('[ws-handler] Message accountId:', data.accountId);

// Server broadcast
console.log(`[WebSocket] 🔍 Broadcasting to ${subs.size} subscribers`);
console.log(`[WebSocket] 🎯 Decision: isAI=${isAIMessage}, isSender=${isSender}, isRecipient=${isRecipient}`);
```

#### Authorization Debug
```typescript
// Account validation
console.log('[ws-handler] 🔒 ACCOUNT VALIDATION FAILED:', userValidation.reason);

// Participant validation
console.log('[WebSocket] 🔒 ACCESO DENEGADO: accountId no es participante');
console.log('  - Participants:', participants.map(p => p.accountId));
console.log('  - Sender:', data.senderAccountId);
```

## Problemas Resueltos y Parches Aplicados

### 1. Reconexiones Infinitas (Error 1006)

#### Problema Identificado
El WebSocket sufría reconexiones constantes debido a una cadena de re-renders en el frontend:

1. **useExtensions** actualizaba estado → render
2. **Padre recreaba callbacks inline** → nuevas referencias  
3. **useWebSocket** actualizaba `callbacksRef.current` → render
4. **useWebSocket** re-ejecutaba `useEffect` (por `connect` cambiado)
5. **useEffect** llamaba `connect()` → nuevo WebSocket
6. **WebSocket anterior** se cerraba → 1006
7. **onclose** del WebSocket anterior llamaba `connect()` vieja → otro WebSocket

#### Parches Aplicados

##### 1.1 Optimización de Callbacks en useWebSocket
```typescript
// ANTES: Se actualizaba en cada render
callbacksRef.current = {
  onMessage,
  onSuggestion,
  // ...
};

// AHORA: Solo se actualiza si realmente cambió
if (
  prevCallbacksRef.current.onMessage !== onMessage ||
  prevCallbacksRef.current.onSuggestion !== onSuggestion ||
  // ... otros callbacks
) {
  callbacksRef.current = { /* nuevos callbacks */ };
  prevCallbacksRef.current = callbacksRef.current;
}
```

##### 1.2 Estabilización de Conexión
```typescript
// ANTES: connect en dependencias causaba reconexiones infinitas
}, [autoConnect, connect, disconnect, effectiveAccountId, effectiveAuthToken]);

// AHORA: connect eliminado de dependencias
}, [autoConnect, disconnect, effectiveAccountId, effectiveAuthToken]);
```

##### 1.3 Guards en AccountStore
```typescript
// ANTES: setState incondicional
set({ activeActorId: actorId });

// AHORA: Solo actualiza si realmente cambió
const current = get().activeActorId;
if (current !== actorId) {
  set({ activeActorId: actorId });
}
```

##### 1.4 Eliminación de Loop Infinito en AccountSwitcher
```typescript
// ANTES: loadAccounts en dependencias causaba loop
}, [loadAccounts]);

// AHORA: Sin dependencias
}, []);
```

##### 1.5 Evitar Doble Ejecución en App.tsx
```typescript
// ANTES: initFromStorage en dependencias
}, [initFromStorage]);

// AHORA: Sin dependencias
}, []);
```

##### 1.6 Desactivación de React.StrictMode
```typescript
// ANTES: React.StrictMode duplicaba efectos en desarrollo
<React.StrictMode>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</React.StrictMode>

// AHORA: Sin StrictMode
<BrowserRouter>
  <App />
</BrowserRouter>
```

### 2. Diagnóstico de Problemas

#### Herramientas de Diagnóstico Implementadas

##### 2.1 Stack Traces para loadAccounts
```typescript
console.trace('[AccountStore] loadAccounts called from:');
```

##### 2.2 Verificación de Valores Iguales
```typescript
console.log('[AccountStore] setActiveActor current:', current, '→ new:', actorId, 'same?', current === actorId);
```

##### 2.3 Stack Trace de Cierre de WebSocket
```typescript
console.trace('[WebSocket] ws.close() called from:');
```

### 3. Resultado Esperado

#### ✅ Problemas Solucionados
- **Reconexiones infinitas** - causadas por `connect` en dependencias
- **Spam de setState** - causado por guards faltantes
- **Loop de loadAccounts** - causado por dependencias circulares
- **Doble ejecución de efectos** - causado por React.StrictMode

#### 📊 Mejoras Esperadas
- **WebSocket estable** sin reconexiones constantes
- **Menos logs en consola** 
- **Mejor performance**
- **Sin 1006 frecuentes**
- **Mensajes en tiempo real sin necesidad de actualizar la página**

---

## Future Enhancements

### 1. WebSocket Compression
- Enable per-message compression for large payloads
- Implement adaptive compression based on message size

### 2. Connection Pooling
- Reuse WebSocket connections across browser tabs
- Implement cross-tab synchronization

### 3. Advanced Authorization
- Role-based message filtering
- Dynamic permission updates without reconnection

### 4. Monitoring & Analytics
- Connection metrics collection
- Message delivery latency tracking
- Error rate monitoring with alerts

## File Structure & Key Files

### Server-Side Files
```
apps/api/src/
├── server.ts                    # Main server with WebSocket upgrade logic
├── websocket/
│   └── ws-handler.ts           # WebSocket message handling & broadcasting
├── services/
│   ├── account-activation.service.ts  # Account validation
│   ├── conversation-participant.service.ts  # Participant validation
│   └── message-deletion.service.ts       # Message visibility filtering
└── utils/
    └── actor-resolver.ts       # Account to actor resolution
```

### Client-Side Files
```
apps/web/src/
├── hooks/
│   ├── useWebSocket.ts         # Main WebSocket hook
│   └── useChat.ts             # Chat-specific WebSocket usage
├── components/
│   └── chat/
│       └── ChatView.tsx       # WebSocket integration in UI
├── services/
│   └── api.ts                 # HTTP API (complements WebSocket)
└── public-profile/
    └── hooks/
        └── usePublicChat.ts    # Widget WebSocket implementation
```

### Key Configuration Files
```
├── .env                        # Environment variables (VITE_WS_URL)
├── package.json               # Dependencies (no @elysiajs/websocket)
└── tsconfig.json             # TypeScript configuration
```

## WebSocket Message Types Reference

### Core Message Types
```typescript
// Connection management
{ type: 'connected' }
{ type: 'subscribed', relationshipId?: string, conversationId?: string }
{ type: 'unsubscribed', relationshipId?: string, conversationId?: string }

// Chat messages
{ type: 'message:new', data: Message }
{ type: 'message:sent', messageId: string }

// AI Suggestions
{ type: 'suggestion:generating' }
{ type: 'suggestion:ready', data: AISuggestion }
{ type: 'suggestion:auto_waiting', suggestionId: string, delayMs: number }
{ type: 'suggestion:auto_typing', suggestionId: string }
{ type: 'suggestion:auto_sending', suggestionId: string }
{ type: 'suggestion:auto_cancelled', suggestionId: string }

// User Activity
{ type: 'user_activity_state', data: { accountId: string, conversationId: string, activity: string } }

// System events
{ type: 'account:deleted', accountId: string }
{ type: 'ai:execution_blocked', data: { block: { message: string }, accountId: string } }

// Widget/Public Profile
{ type: 'widget:connected', accountId: string, visitorActorId: string }
{ type: 'widget:error', message: string }
{ type: 'widget:visitor_actor', visitorActorId: string }
{ type: 'widget:message_received', conversationId: string, visitorActorId: string }

// Keep-alive
{ type: 'ping' }
{ type: 'pong', timestamp: string }

// Errors
{ type: 'error', message: string, code?: string }
```

### Client-to-Server Message Types
```typescript
// Subscriptions
{ type: 'subscribe', relationshipId?: string, conversationId?: string }
{ type: 'unsubscribe', relationshipId?: string, conversationId?: string }

// Chat
{ type: 'message', conversationId: string, senderAccountId: string, content: any }

// AI Suggestions
{ type: 'request_suggestion', conversationId: string, accountId: string }
{ type: 'approve_suggestion', conversationId: string, senderAccountId: string, suggestionId: string, suggestedText: string }
{ type: 'discard_suggestion', suggestionId: string }

// Activity
{ type: 'user_activity', conversationId: string, accountId: string, activity: 'typing' | 'recording' | 'idle' | 'cancel' }

// Widget
{ type: 'widget:connect', alias: string, visitorToken: string }
{ type: 'widget:message', alias: string, visitorToken: string, content: any }

// Keep-alive
{ type: 'ping' }
```

## Integration Examples

### 1. Basic Chat Integration
```typescript
// In ChatView.tsx
const { sendMessage, subscribeConversation, status } = useWebSocket({
  onMessage: (msg) => {
    if (msg.type === 'message:new' && msg.data?.conversationId === conversationId) {
      addReceivedMessage(msg.data);
    }
  },
  onActivityState: (event) => {
    if (event.conversationId === conversationId) {
      setParticipantActivities(prev => ({
        ...prev,
        [event.accountId]: event.activity
      }));
    }
  }
});

// Subscribe to conversation
useEffect(() => {
  if (conversationId) {
    subscribeConversation(conversationId);
  }
}, [conversationId]);
```

### 2. AI Suggestions Integration
```typescript
const { requestSuggestion, approveSuggestion, onSuggestion } = useWebSocket({
  onSuggestion: (suggestion) => {
    if (suggestion.conversationId === conversationId) {
      addSuggestion(suggestion);
    }
  }
});

// Request suggestion
const handleRequestSuggestion = () => {
  requestSuggestion({
    conversationId,
    accountId: activeAccountId
  });
};

// Approve suggestion
const handleApproveSuggestion = (suggestion) => {
  approveSuggestion({
    conversationId,
    senderAccountId: activeAccountId,
    suggestionId: suggestion.id,
    suggestedText: suggestion.text
  });
};
```

### 3. Widget Integration
```typescript
// In usePublicChat.ts
const connectWebSocket = useCallback(() => {
  const wsUrl = isAuthenticated && token
    ? `${WS_URL}?token=${encodeURIComponent(token)}`
    : WS_URL;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    if (isAuthenticated) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        conversationId: conversationIdRef.current
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'widget:connect',
        alias,
        visitorToken
      }));
    }
  };
}, [alias, visitorToken, isAuthenticated]);
```

---

*Last Updated: 2026-03-13*
*Version: 1.1*
*Status: Active - Parches Aplicados*
*Author: FluxCore Development Team*
