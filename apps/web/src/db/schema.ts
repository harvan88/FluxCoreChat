/**
 * C3: Offline-First - IndexedDB Schema
 * 
 * Define tipos para entidades locales con estado de sincronización.
 * Basado en TOTEM PARTE 9.1 - Dual Source of Truth.
 */

/**
 * Estado de sincronización de una entidad
 */
export type SyncState = 
  | 'local_only'      // Solo existe localmente (creado offline)
  | 'pending_backend' // Pendiente de sincronizar con backend
  | 'synced'          // Sincronizado con backend
  | 'conflict';       // Conflicto detectado (backend prevalece)

/**
 * Operación pendiente
 */
export type PendingOperation = 'create' | 'update' | 'delete';

/**
 * Contenido de mensaje (mismo que backend)
 */
export interface MessageContent {
  text: string;
  type?: string;
  media?: Array<{
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    filename?: string;
  }>;
}

/**
 * Mensaje local con estado de sync
 */
export interface LocalMessage {
  id: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: 'incoming' | 'outgoing' | 'system';
  
  // Sync state
  syncState: SyncState;
  pendingOperation?: PendingOperation;
  
  // Timestamps
  localCreatedAt: Date;
  serverCreatedAt?: Date;
  
  // COR-002: Status (from backend)
  status?: 'local_only' | 'pending_backend' | 'synced' | 'sent' | 'delivered' | 'seen';
  
  // Actor Model (COR-004)
  fromActorId?: string;
  toActorId?: string;
  
  // AI metadata
  generatedBy?: 'human' | 'ai';
}

/**
 * Conversación local con estado de sync
 */
export interface LocalConversation {
  id: string;
  relationshipId: string;
  channel: string;
  status: 'active' | 'archived' | 'deleted';
  
  // Sync state
  syncState: SyncState;
  pendingOperation?: PendingOperation;
  
  // Timestamps
  localCreatedAt: Date;
  serverCreatedAt?: Date;
  lastMessageAt?: Date;
  
  // Metadata
  unreadCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Relación local con estado de sync
 */
export interface LocalRelationship {
  id: string;
  accountAId: string;
  accountBId: string;
  
  // Sync state
  syncState: SyncState;
  pendingOperation?: PendingOperation;
  
  // Timestamps
  localCreatedAt: Date;
  serverCreatedAt?: Date;
  lastInteraction?: Date;
  
  // Context (simplified for local storage)
  contextSummary?: string;
}

/**
 * Item en la cola de sincronización
 */
export interface SyncQueueItem {
  id: string; // UUID
  entityType: 'message' | 'conversation' | 'relationship';
  entityId: string;
  operation: PendingOperation;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  payload: unknown;
  
  // Retry logic
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  
  // Timestamps
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Helper para crear mensaje local
 */
export function createLocalMessage(
  conversationId: string,
  senderAccountId: string,
  content: MessageContent,
  type: 'incoming' | 'outgoing' | 'system' = 'outgoing'
): LocalMessage {
  return {
    id: crypto.randomUUID(),
    conversationId,
    senderAccountId,
    content,
    type,
    syncState: 'local_only',
    pendingOperation: 'create',
    localCreatedAt: new Date(),
    status: 'local_only',
    generatedBy: 'human',
  };
}

/**
 * Helper para crear item de sync queue
 */
export function createSyncQueueItem(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  operation: PendingOperation,
  payload: unknown
): SyncQueueItem {
  return {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    operation,
    status: 'pending',
    payload,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
  };
}
