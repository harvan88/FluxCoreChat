# Hito C3: Offline-First con IndexedDB

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06  
> **Prioridad**: Alta  
> **Dependencias**: COR-002 (Message Status)

---

## Resumen

Implementación de Dual Source of Truth según TOTEM PARTE 9.1, permitiendo que la aplicación funcione sin conexión y sincronice automáticamente al recuperar conexión.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
├─────────────────────────────────────────────────────────────┤
│  React Components                                            │
│       ↓                                                      │
│  useOfflineMessages() Hook                                   │
│       ↓                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │ SyncManager │ ←→ │ SyncQueue   │ ←→ │ IndexedDB   │      │
│  └──────┬──────┘    └─────────────┘    │ (Dexie.js)  │      │
│         │                              └─────────────┘      │
│         ↓                                                    │
│  ┌─────────────┐                                            │
│  │  Backend    │                                            │
│  │   API       │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de Archivos

```
apps/web/src/
├── db/
│   ├── index.ts          # Configuración Dexie.js
│   ├── schema.ts         # Tipos para entidades locales
│   └── sync/
│       ├── index.ts      # Exports
│       ├── syncManager.ts # Coordinador de sincronización
│       └── syncQueue.ts   # Cola de operaciones pendientes
└── hooks/
    └── useOfflineFirst.ts # Hooks de React
```

---

## Componentes Implementados

### 1. IndexedDB Schema (`db/schema.ts`)

```typescript
// Estados de sincronización
type SyncState = 'local_only' | 'pending_backend' | 'synced' | 'conflict';

// Mensaje local
interface LocalMessage {
  id: string;
  conversationId: string;
  content: MessageContent;
  syncState: SyncState;
  localCreatedAt: Date;
  serverCreatedAt?: Date;
  // ...
}
```

### 2. Sync Manager (`db/sync/syncManager.ts`)

Funcionalidades principales:
- **Optimistic Updates**: UI actualiza inmediatamente
- **Background Sync**: Sincroniza en segundo plano
- **Auto-reconnect**: Sincroniza al recuperar conexión
- **Conflict Resolution**: Backend prevalece

```typescript
// Crear mensaje con optimistic update
const message = await syncManager.createMessage(
  conversationId,
  senderAccountId,
  { text: 'Hola!' }
);
// UI actualiza inmediatamente, sync en background
```

### 3. Sync Queue (`db/sync/syncQueue.ts`)

- Cola persistente de operaciones pendientes
- Reintentos automáticos (max 3)
- Tracking de errores

### 4. React Hooks (`hooks/useOfflineFirst.ts`)

```typescript
// Hook principal para mensajes
const { messages, sendMessage, isLoading, error } = useOfflineMessages(conversationId);

// Hook de estado de conexión
const status = useConnectionStatus(); // 'online' | 'offline' | 'syncing'

// Hook de sincronización manual
const { sync, isSyncing } = useSync();

// Hook de estadísticas de cola
const { pending, failed, total } = useSyncQueueStats();
```

---

## Flujo de Datos

### Enviar Mensaje (Online)

```
1. Usuario escribe mensaje
2. sendMessage() llamado
3. Mensaje guardado en IndexedDB (syncState: 'local_only')
4. UI actualiza inmediatamente
5. Mensaje añadido a SyncQueue
6. SyncManager envía a backend
7. Backend responde OK
8. Mensaje actualizado (syncState: 'synced')
9. Removido de SyncQueue
```

### Enviar Mensaje (Offline)

```
1. Usuario escribe mensaje
2. sendMessage() llamado
3. Mensaje guardado en IndexedDB (syncState: 'local_only')
4. UI actualiza inmediatamente
5. Mensaje añadido a SyncQueue
6. Sync falla (offline)
7. Mensaje permanece en queue
8. [Usuario recupera conexión]
9. SyncManager detecta reconexión
10. syncPending() ejecutado
11. Mensajes sincronizados
```

---

## Instrucciones para Pruebas Manuales

### 1. Verificar IndexedDB en Browser

1. Abrir DevTools (F12)
2. Ir a Application > IndexedDB
3. Buscar "FluxCoreDB"
4. Verificar tablas: messages, conversations, relationships, syncQueue

### 2. Probar Modo Offline

1. Abrir la aplicación
2. Ir a DevTools > Network
3. Seleccionar "Offline"
4. Enviar un mensaje
5. Verificar que el mensaje aparece con syncState: 'local_only'
6. Desactivar "Offline"
7. Verificar que el mensaje se sincroniza automáticamente

### 3. Verificar Optimistic Updates

1. Con conexión normal
2. Enviar mensaje
3. Verificar que aparece inmediatamente
4. Verificar en IndexedDB que syncState cambia: local_only → pending_backend → synced

---

## Uso en Componentes

```tsx
import { useOfflineMessages, useConnectionStatus } from '../hooks/useOfflineFirst';

function ChatView({ conversationId }: Props) {
  const { messages, sendMessage, isLoading } = useOfflineMessages(conversationId);
  const connectionStatus = useConnectionStatus();

  const handleSend = async (text: string) => {
    await sendMessage(currentAccountId, { text });
  };

  return (
    <div>
      {connectionStatus === 'offline' && (
        <div className="offline-banner">Sin conexión</div>
      )}
      
      {messages.map(msg => (
        <Message 
          key={msg.id} 
          data={msg}
          isPending={msg.syncState !== 'synced'}
        />
      ))}
    </div>
  );
}
```

---

## Dependencias Añadidas

```json
{
  "dexie": "^4.2.1"
}
```

---

## Checklist de Validación

- [x] Dexie.js instalado y configurado
- [x] Schema IndexedDB definido (messages, conversations, relationships, syncQueue)
- [x] SyncManager implementado con optimistic updates
- [x] SyncQueue con reintentos automáticos
- [x] Auto-sync al recuperar conexión
- [x] Hooks de React: useOfflineMessages, useConnectionStatus, useSync
- [x] Build de producción exitoso
- [x] Documentación completa

---

## Limitaciones Conocidas

1. **Conflictos**: Backend siempre prevalece (sin merge inteligente)
2. **Tamaño**: IndexedDB tiene límite de almacenamiento del navegador
3. **Sincronización**: Solo mensajes implementados (conversations y relationships pendientes)

---

## Próximos Pasos

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| - | Sincronización de conversations | MEDIA |
| - | Sincronización de relationships | MEDIA |
| - | UI de estado de sincronización | MEDIA |
| COR-007 | Automation controller | MEDIA |

---

**Última actualización**: 2025-12-06
