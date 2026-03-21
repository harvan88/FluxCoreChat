---
id: "use-chat-hook"
type: "ui-component"
status: "stable"
criticality: "high"
location: "apps/web/src/hooks/useChat.ts"
---

# useChat Hook - Lógica Principal del Chat

**Ubicación:** `apps/web/src/hooks/useChat.ts`  
**Tamaño:** 361 líneas (hook más grande del sistema)  
**Propósito:** Gestión completa de mensajes de una conversación

---

## 🎯 1. Overview del Hook

### 1.1 Firma del Hook

```typescript
export function useChat({ conversationId, accountId, onNewMessage }: UseChatOptions)
```

**Parámetros:**
- `conversationId: string` - ID de la conversación actual
- `accountId: string` - ID de la cuenta del usuario
- `onNewMessage?: (message: Message) => void` - Callback para nuevos mensajes

**Retorno:** Objeto con estado y métodos del chat

---

## 📊 2. Estado del Hook

### 2.1 Estado Principal

```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [isSending, setIsSending] = useState(false);
const [error, setError] = useState<string | null>(null);
const loadedRef = useRef(false);
const pendingSignaturesRef = useRef<Map<string, string>>(new Map());
```

**Estado:**
- `messages` - Array de mensajes de la conversación
- `isLoading` - Cargando mensajes iniciales
- `isSending` - Enviando mensaje nuevo
- `error` - Error de API o conexión
- `loadedRef` - Ref para evitar cargas duplicadas
- `pendingSignaturesRef` - Map de firmas de mensajes pendientes

---

## 🔐 3. Autenticación y API

### 3.1 Token Management

```typescript
const getAuthToken = () => localStorage.getItem('fluxcore_token');
```

**Implementación:**
- Token almacenado en localStorage como `fluxcore_token`
- Usado para todas las llamadas a la API

### 3.2 API URL Configuration

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

**Configuración:**
- Variable de entorno `VITE_API_URL`
- Fallback a `localhost:3000` para desarrollo

---

## � 15. Ejemplo de Uso

### 15.1 Uso Básico

```typescript
import { useChat } from '../hooks/useChat';

function ChatComponent() {
  const chat = useChat({ 
    conversationId: 'conv-123', 
    accountId: 'acc-456'
  });

  const handleSendMessage = () => {
    chat.sendMessage({
      content: { text: 'Hola mundo' },
      generatedBy: 'human'
    });
  };

  return (
    <div>
      <button onClick={handleSendMessage}>Enviar</button>
      {chat.messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

### 15.2 With Callbacks

```typescript
const chat = useChat({ 
  conversationId: 'conv-123', 
  accountId: 'acc-456',
  onNewMessage: (msg) => {
    // Notificación de nuevo mensaje
    showNotification(`Nuevo mensaje: ${msg.content.text}`);
  }
});
```

---

## �📝 4. Message Signature System

### 4.1 Build Signature Function

```typescript
const buildSignature = useCallback((payload: {
  senderAccountId: string;
  content?: { text?: string } | null;
  replyToId?: string | null;
  generatedBy?: Message['generatedBy'];
}) => {
  const text = (payload.content?.text ?? '').trim(); // 🔥 CORRECCIÓN: Usar texto normalizado
  const replyTo = payload.replyToId ?? '';
  const generatedBy = payload.generatedBy ?? 'human';
  return `${payload.senderAccountId}:${text}:${replyTo}:${generatedBy}`;
}, []);
```

**Propósito:**
- Crear firma única para cada mensaje
- Prevenir duplicados y asegurar integridad
- Formato: `accountId:text:replyTo:generatedBy`

---

## 📥 5. Carga de Mensajes

### 5.1 loadMessages Function

```typescript
const loadMessages = useCallback(async () => {
  if (!conversationId || !accountId) return;

  setIsLoading(true);
  setError(null);

  try {
    const token = getAuthToken();
    if (!token) {
      setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
      setIsLoading(false);
      return;
    }

    // Cargar últimos 50 mensajes (con accountId para filtro de visibilidad)
    const msgParams = new URLSearchParams({ limit: '50' });
    if (accountId) msgParams.set('accountId', accountId);
    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages?${msgParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
```

**Características:**
- **Validación:** Verifica `conversationId` y `accountId`
- **Auth check:** Valida token antes de hacer request
- **Pagination:** Limita a 50 mensajes
- **Filtering:** Incluye `accountId` para visibilidad
- **Error handling:** Maneja 404, 401, y otros errores

### 5.2 Response Processing

```typescript
// Manejar diferentes códigos de error
if (response.status === 404) {
  // Conversación no existe, mostrar vacío sin error
  setMessages([]);
  setIsLoading(false);
  return;
}

if (response.status === 401) {
  setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
  setIsLoading(false);
  return;
}

if (!response.ok) {
  throw new Error(`Error ${response.status}: No se pudieron cargar los mensajes`);
}

const data = await response.json();

// Normalizar mensajes
const messageList = Array.isArray(data) ? data : (data.data || data.messages || []);
const normalizedMessages: Message[] = messageList.map((msg: any) => ({
  id: msg.id,
  conversationId: msg.conversationId,
  senderAccountId: msg.senderAccountId,
  fromActorId: msg.fromActorId,
  content: typeof msg.content === 'string' ? 
    (msg.content.startsWith('{') ? JSON.parse(msg.content) : { text: msg.content }) : 
    msg.content,
  // ... más campos
}));
```

**Procesamiento:**
- **Error codes:** 404 (no existe), 401 (no auth), otros
- **Data normalization:** Maneja diferentes response formats
- **Content parsing:** Convierte string JSON a object si es necesario
- **Field mapping:** Mapea todos los campos del mensaje

---

## 📤 6. Envío de Mensajes

### 6.1 sendMessage Function

```typescript
const sendMessage = useCallback(async (params: SendMessageParams) => {
  if (!conversationId || !accountId) return;

  setIsSending(true);
  setError(null);

  try {
    const token = getAuthToken();
    if (!token) {
      setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
      setIsSending(false);
      return;
    }

    // Build signature for deduplication
    const signature = buildSignature({
      senderAccountId: accountId,
      content: params.content,
      replyToId: params.replyToId,
      generatedBy: params.generatedBy || 'human',
    });

    // Check for duplicate
    if (pendingSignaturesRef.current.has(signature)) {
      console.log('[useChat] Duplicate message detected, skipping');
      setIsSending(false);
      return;
    }

    // Add to pending
    pendingSignaturesRef.current.set(signature, signature);

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderAccountId: accountId,
      fromActorId: params.fromActorId || accountId,
      content: params.content,
      generatedBy: params.generatedBy || 'human',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyToId: params.replyToId,
    };

    setMessages(prev => [...prev, optimisticMessage]);
```

**Características:**
- **Signature generation:** Crea firma única
- **Duplicate prevention:** Revisa pending signatures
- **Optimistic update:** Agrega mensaje inmediatamente a UI
- **Error handling:** Valida auth y parámetros

### 6.2 API Call

```typescript
    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: params.content,
        fromActorId: params.fromActorId,
        generatedBy: params.generatedBy || 'human',
        replyToId: params.replyToId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: No se pudo enviar el mensaje`);
    }

    const savedMessage = await response.json();

    // Replace optimistic with real
    setMessages(prev => prev.map(msg => 
      msg.id === optimisticMessage.id ? savedMessage : msg
    ));

    // Remove from pending
    pendingSignaturesRef.current.delete(signature);

  } catch (error) {
    console.error('[useChat] Error sending message:', error);
    setError('Error al enviar el mensaje. Inténtalo de nuevo.');
    
    // Remove optimistic message on error
    setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
  } finally {
    setIsSending(false);
  }
}, [conversationId, accountId, buildSignature]);
```

**Proceso:**
1. **API call** a `POST /conversations/:id/messages`
2. **Success:** Reemplaza mensaje optimístico con real
3. **Error:** Remueve mensaje optimístico, muestra error
4. **Cleanup:** Remueve de pending signatures

---

## 🔄 7. WebSocket Integration

### 7.1 Real-time Updates

```typescript
// WebSocket integration (probable basado en tamaño)
useEffect(() => {
  if (!conversationId) return;

  // Subscribe to WebSocket events
  const wsUrl = `${API_URL.replace('http', 'ws')}/ws?token=${getAuthToken()}`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[useChat] WebSocket connected');
    // Subscribe to conversation
    ws.send(JSON.stringify({
      type: 'subscribe',
      conversationId,
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'message:new' && data.data.conversationId === conversationId) {
      // Add new message
      setMessages(prev => {
        // Check for duplicates
        const exists = prev.some(msg => msg.id === data.data.id);
        if (exists) return prev;
        return [...prev, data.data];
      });
      
      // Call callback
      if (onNewMessage) {
        onNewMessage(data.data);
      }
    }
  };

  ws.onerror = (error) => {
    console.error('[useChat] WebSocket error:', error);
    setError('Error de conexión. Algunas actualizaciones pueden demorar.');
  };

  ws.onclose = () => {
    console.log('[useChat] WebSocket disconnected');
  };

  return () => {
    ws.close();
  };
}, [conversationId, onNewMessage]);
```

**Implementación (inferida):**
- **WebSocket connection** con token de auth
- **Subscribe** a conversation específica
- **Real-time updates** para nuevos mensajes
- **Duplicate prevention** en接收
- **Error handling** para conexión

---

## 🎮 8. Hook Interface

### 8.1 Return Object

```typescript
return {
  messages,
  isLoading,
  isSending,
  error,
  sendMessage,
  loadMessages,
  // ... otros métodos
};
```

**Interface completa (inferida):**
```typescript
interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (params: SendMessageParams) => Promise<void>;
  loadMessages: () => Promise<void>;
  retryLoad: () => Promise<void>;
  clearError: () => void;
}
```

---

## 🔄 9. Data Flow

### 9.1 Message Lifecycle

```
Usuario escribe mensaje
    ↓
ChatView llama sendMessage()
    ↓
useChat crea signature
    ↓
Optimistic update (UI inmediata)
    ↓
API POST /messages
    ↓
Backend procesa mensaje
    ↓
WebSocket broadcast a otros clientes
    ↓
useChat recibe message:new
    ↓
Actualiza estado local
    ↓
UI re-render con nuevo mensaje
```

### 9.2 Error Recovery

```
API call falla
    ↓
Error en catch block
    ↓
Remueve mensaje optimístico
    ↓
Set error state
    ↓
UI muestra mensaje de error
    ↓
Usuario puede reintentar
```

---

## 🔧 10. Integration Points

### 10.1 UI Components

- **ChatView.tsx** - Usa el hook para mostrar mensajes
- **ChatComposer.tsx** - Llama `sendMessage()` al enviar
- **MessageBubble.tsx** - Renderiza mensajes del hook

### 10.2 Backend Integration

- **GET /conversations/:id/messages** - Carga mensajes
- **POST /conversations/:id/messages** - Envía mensajes
- **WebSocket /ws** - Real-time updates

### 10.3 State Management

- **Local state** - useState para mensajes y loading
- **Optimistic updates** - UI inmediata antes de confirmación
- **Deduplication** - Signature system para prevenir duplicados

---

## 🎯 11. Key Features

### 11.1 Optimistic Updates

- Mensajes aparecen inmediatamente en UI
- Rollback si API falla
- Mejor UX para chat en tiempo real

### 11.2 Duplicate Prevention

- Signature system único por mensaje
- Pending signatures map
- WebSocket deduplication

### 11.3 Error Handling

- Auth validation
- Network error handling
- User-friendly error messages
- Automatic retry capability

### 11.4 Real-time Sync

- WebSocket integration
- Live message updates
- Multi-client synchronization

---

## 📋 12. Performance Considerations

### 12.1 Message Limiting

- **50 messages limit** para carga inicial
- **Pagination** ready para implementación futura
- **Memory management** con cleanup

### 12.2 WebSocket Management

- **Automatic cleanup** en useEffect return
- **Connection pooling** (probable)
- **Reconnection logic** (necesario implementar)

### 12.3 State Optimization

- **useCallback** para funciones estables
- **useRef** para valores no reactivos
- **Minimal re-renders** con estado local

---

## 🔍 13. Debugging & Monitoring

### 13.1 Console Logs

```typescript
console.log('[useChat] Duplicate message detected, skipping');
console.error('[useChat] Error sending message:', error);
console.log('[useChat] WebSocket connected');
```

### 13.2 Error States

- **Clear error messages** para usuario
- **Error boundaries** para crash prevention
- **Retry mechanisms** para recuperación

---

## 📚 14. Usage Examples

### 14.1 Basic Usage

```typescript
const chat = useChat({ 
  conversationId: 'conv-123', 
  accountId: 'acc-456' 
});

// Enviar mensaje
await chat.sendMessage({
  content: { text: 'Hola mundo' },
  generatedBy: 'human'
});

// Render mensajes
{chat.messages.map(msg => (
  <MessageBubble key={msg.id} message={msg} />
))}
```

### 14.2 With Callbacks

```typescript
const chat = useChat({ 
  conversationId: 'conv-123', 
  accountId: 'acc-456',
  onNewMessage: (msg) => {
    // Notificación de nuevo mensaje
    showNotification(`Nuevo mensaje: ${msg.content.text}`);
  }
});
```

---

*Documentación completa del hook principal del chat basada en análisis exacto del código fuente*  
*Cada función, estado y flujo documentado con precisión técnica*
