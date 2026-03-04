# AUDITORÍA COMPLETA DEL SISTEMA DE MENSAJES

**Fecha:** 2026-03-02T02:13:07.530Z
**Proyecto:** FluxCoreChat
**Total de archivos analizados:** 20

## 📋 Tabla de Contenidos

1. [MessageCore - Corazón del Sistema de Mensajes](#messagecore---corazn-del-sistema-de-mensajes)
2. [MessageService - Servicio de Base de Datos](#messageservice---servicio-de-base-de-datos)
3. [ConversationService - Gestión de Conversaciones](#conversationservice---gestin-de-conversaciones)
4. [Conversations Routes - Endpoints de API](#conversations-routes---endpoints-de-api)
5. [Messages Routes - Endpoints de Mensajes](#messages-routes---endpoints-de-mensajes)
6. [MessageDispatchService - Despacho de Mensajes](#messagedispatchservice---despacho-de-mensajes)
7. [AI Service - Procesamiento de IA](#ai-service---procesamiento-de-ia)
8. [ExtensionHostService - Host de Extensiones](#extensionhostservice---host-de-extensiones)
9. [WebSocket Handler - Manejo de Conexiones WebSocket](#websocket-handler---manejo-de-conexiones-websocket)
10. [useChat Hook - Hook Principal de Chat](#usechat-hook---hook-principal-de-chat)
11. [useWebSocket Hook - Hook de WebSocket](#usewebsocket-hook---hook-de-websocket)
12. [useOfflineFirst Hook - Soporte Offline](#useofflinefirst-hook---soporte-offline)
13. [IndexedDB Config - Configuración de Base de Datos Local](#indexeddb-config---configuracin-de-base-de-datos-local)
14. [IndexedDB Schema - Esquema de Base de Datos Local](#indexeddb-schema---esquema-de-base-de-datos-local)
15. [SyncManager - Gestor de Sincronización](#syncmanager---gestor-de-sincronizacin)
16. [ChatView Component - Vista Principal de Chat](#chatview-component---vista-principal-de-chat)
17. [MessageBubble Component - Burbuja de Mensaje](#messagebubble-component---burbuja-de-mensaje)
18. [ChatComposer Component - Compositor de Mensajes](#chatcomposer-component---compositor-de-mensajes)
19. [Types - Tipos Principales](#types---tipos-principales)
20. [Database Schema - Esquema de PostgreSQL](#database-schema---esquema-de-postgresql)

---

## 1. MessageCore - Corazón del Sistema de Mensajes

**Archivo:** `apps/api/src/core/message-core.ts`

**Descripción:** Clase principal que maneja recepción, persistencia y broadcasting de mensajes

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/core/message-core.ts
```

---

## 2. MessageService - Servicio de Base de Datos

**Archivo:** `apps/api/src/services/message.service.ts`

**Descripción:** Servicio para CRUD de mensajes en PostgreSQL

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/services/message.service.ts
```

---

## 3. ConversationService - Gestión de Conversaciones

**Archivo:** `apps/api/src/services/conversation.service.ts`

**Descripción:** Servicio para manejar conversaciones y su relación con mensajes

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/services/conversation.service.ts
```

---

## 4. Conversations Routes - Endpoints de API

**Archivo:** `apps/api/src/routes/conversations.routes.ts`

**Descripción:** Endpoints para obtener mensajes de conversaciones

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/routes/conversations.routes.ts
```

---

## 5. Messages Routes - Endpoints de Mensajes

**Archivo:** `apps/api/src/routes/messages.routes.ts`

**Descripción:** Endpoints directos para operaciones de mensajes

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/routes/messages.routes.ts
```

---

## 6. MessageDispatchService - Despacho de Mensajes

**Archivo:** `apps/api/src/services/message-dispatch.service.ts`

**Descripción:** Servicio que despacha mensajes a extensiones y runtime

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/services/message-dispatch.service.ts
```

---

## 7. AI Service - Procesamiento de IA

**Archivo:** `apps/api/src/services/ai.service.ts`

**Descripción:** Servicio que maneja respuestas automáticas de IA

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/services/ai.service.ts
```

---

## 8. ExtensionHostService - Host de Extensiones

**Archivo:** `apps/api/src/services/extension-host.service.ts`

**Descripción:** Servicio que ejecuta extensiones como FluxCore

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/services/extension-host.service.ts
```

---

## 9. WebSocket Handler - Manejo de Conexiones WebSocket

**Archivo:** `apps/api/src/websocket/ws-handler.ts`

**Descripción:** Handler principal para conexiones WebSocket y broadcasting

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/api/src/websocket/ws-handler.ts
```

---

## 10. useChat Hook - Hook Principal de Chat

**Archivo:** `apps/web/src/hooks/useChat.ts`

**Descripción:** Hook de React para manejar mensajes en el frontend

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/hooks/useChat.ts
```

---

## 11. useWebSocket Hook - Hook de WebSocket

**Archivo:** `apps/web/src/hooks/useWebSocket.ts`

**Descripción:** Hook para manejar conexiones WebSocket en el frontend

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/hooks/useWebSocket.ts
```

---

## 12. useOfflineFirst Hook - Soporte Offline

**Archivo:** `apps/web/src/hooks/useOfflineFirst.ts`

**Descripción:** Hook para manejar mensajes offline-first con IndexedDB

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/hooks/useOfflineFirst.ts
```

---

## 13. IndexedDB Config - Configuración de Base de Datos Local

**Archivo:** `apps/web/src/db/index.ts`

**Descripción:** Configuración de Dexie.js para IndexedDB

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/db/index.ts
```

---

## 14. IndexedDB Schema - Esquema de Base de Datos Local

**Archivo:** `apps/web/src/db/schema.ts`

**Descripción:** Esquema de tipos para IndexedDB

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/db/schema.ts
```

---

## 15. SyncManager - Gestor de Sincronización

**Archivo:** `apps/web/src/db/sync/syncManager.ts`

**Descripción:** Gestor para sincronizar IndexedDB con backend

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/db/sync/syncManager.ts
```

---

## 16. ChatView Component - Vista Principal de Chat

**Archivo:** `apps/web/src/components/chat/ChatView.tsx`

**Descripción:** Componente principal que muestra la conversación

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/components/chat/ChatView.tsx
```

---

## 17. MessageBubble Component - Burbuja de Mensaje

**Archivo:** `apps/web/src/components/chat/MessageBubble.tsx`

**Descripción:** Componente para renderizar mensajes individuales

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/components/chat/MessageBubble.tsx
```

---

## 18. ChatComposer Component - Compositor de Mensajes

**Archivo:** `apps/web/src/components/chat/ChatComposer.tsx`

**Descripción:** Componente para escribir y enviar mensajes

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/components/chat/ChatComposer.tsx
```

---

## 19. Types - Tipos Principales

**Archivo:** `apps/web/src/types/index.ts`

**Descripción:** Definiciones de tipos para mensajes y conversaciones

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: apps/web/src/types/index.ts
```

---

## 20. Database Schema - Esquema de PostgreSQL

**Archivo:** `packages/db/src/schema/messages.ts`

**Descripción:** Esquema de tabla messages en PostgreSQL

**Código:**

```typescript
// ARCHIVO NO ENCONTRADO: packages/db/src/schema/messages.ts
```

---

## 🔍 Análisis y Observaciones Clave

### Flujo de Mensajes (Backend)
1. **MessageCore.receive()** → Recibe mensaje
2. **messageService.createMessage()** → Persiste en PostgreSQL
3. **EventBus.emit('core:message_received')** → Notifica a consumidores
4. **MessageDispatchService** → Procesa mensaje
5. **ExtensionHost.processMessage()** → Ejecuta IA/extensiones
6. **WebSocket.broadcast()** → Envía a clientes

### Flujo de Mensajes (Frontend)
1. **useChat.sendMessage()** → Envía mensaje a API
2. **useWebSocket.onMessage()** → Recibe mensajes vía WebSocket
3. **addReceivedMessage()** → Agrega mensaje al estado
4. **MessageBubble render** → Muestra mensaje en UI

### Puntos Críticos Identificados
- **MessageCore.ts**: Corazón del sistema, maneja toda la lógica central
- **useChat.ts**: Hook principal que determina tipo (outgoing/incoming)
- **WebSocket**: Canal de comunicación en tiempo real
- **SyncManager**: Sistema de sincronización offline-first
- **MessageDispatchService**: Despacha a extensiones y runtime

### Posibles Problemas
1. **Duplicación de mensajes**: Loops infinitos en frontend
2. **Espejo de mensajes**: senderAccountId incorrecto
3. **Sincronización**: Conflictos entre IndexedDB y PostgreSQL
4. **WebSocket**: Reconexiones causando reenvíos
5. **Estado compartido**: Múltiples cuentas activas simultáneamente

### Recomendaciones
1. **Revisar dependencias en useEffect** para evitar loops infinitos
2. **Validar senderAccountId** en frontend y backend
3. **Implementar deduplicación** robusta en WebSocket
4. **Centralizar estado de cuenta activa** para evitar confusiones
5. **Agregar logging detallado** para seguimiento de mensajes

