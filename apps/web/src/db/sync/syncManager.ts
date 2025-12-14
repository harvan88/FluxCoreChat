/**
 * C3: Offline-First - Sync Manager
 * 
 * Coordina la sincronización entre IndexedDB y el backend.
 * Implementa optimistic updates y manejo de conflictos.
 */

import { db, type LocalMessage, type SyncQueueItem } from '../index';
import { createSyncQueueItem } from '../schema';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Estado de conexión
 */
export type ConnectionStatus = 'online' | 'offline' | 'syncing';

/**
 * Resultado de sincronización
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Sync Manager - Singleton
 */
class SyncManager {
  private status: ConnectionStatus = 'online';
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private syncInProgress = false;
  private authToken: string | null = null;
  
  // FC-522: Retry configuration
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 1000; // 1 segundo

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      // Initial status
      this.status = navigator.onLine ? 'online' : 'offline';
    }
  }

  /**
   * Set auth token for API requests
   */
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Handle coming online
   */
  private async handleOnline() {
    console.log('[SyncManager] Connection restored');
    this.setStatus('online');
    
    // Auto-sync pending items
    await this.syncPending();
  }

  /**
   * Handle going offline
   */
  private handleOffline() {
    console.log('[SyncManager] Connection lost');
    this.setStatus('offline');
  }

  /**
   * Update status and notify listeners
   */
  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.listeners.forEach(cb => cb(status));
  }

  /**
   * Create message with optimistic update
   * Returns immediately with local message, syncs in background
   */
  async createMessage(
    conversationId: string,
    senderAccountId: string,
    content: { text: string; type?: string },
    type: 'incoming' | 'outgoing' | 'system' = 'outgoing'
  ): Promise<LocalMessage> {
    // Create local message
    const localMessage: LocalMessage = {
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

    // Save to IndexedDB
    await db.messages.add(localMessage);

    // Add to sync queue
    await db.syncQueue.add(createSyncQueueItem(
      'message',
      localMessage.id,
      'create',
      {
        conversationId,
        senderAccountId,
        content,
        type,
      }
    ));

    // Try to sync if online
    if (this.status === 'online') {
      this.syncMessage(localMessage.id).catch(err => {
        console.warn('[SyncManager] Background sync failed:', err);
      });
    }

    return localMessage;
  }

  /**
   * Sync a specific message to backend
   */
  async syncMessage(messageId: string): Promise<boolean> {
    if (!this.authToken) {
      console.warn('[SyncManager] No auth token, skipping sync');
      return false;
    }

    const message = await db.messages.get(messageId);
    if (!message || message.syncState === 'synced') {
      return true;
    }

    try {
      // Update local state to pending
      await db.messages.update(messageId, { 
        syncState: 'pending_backend',
        status: 'pending_backend',
      });

      // Send to backend
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          conversationId: message.conversationId,
          senderAccountId: message.senderAccountId,
          content: message.content,
          type: message.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Response received - update local message
      await db.messages.update(messageId, {
        syncState: 'synced',
        status: 'synced',
        serverCreatedAt: new Date(),
        pendingOperation: undefined,
      });

      // Remove from sync queue
      await db.syncQueue
        .where({ entityType: 'message', entityId: messageId })
        .delete();

      console.log('[SyncManager] Message synced:', messageId);
      return true;

    } catch (error: any) {
      console.error('[SyncManager] Sync failed:', error);
      
      // Update sync queue with error - get item first
      const queueItem = await db.syncQueue
        .where({ entityType: 'message', entityId: messageId })
        .first();
      
      if (queueItem) {
        await db.syncQueue.update(queueItem.id, {
          status: 'failed',
          lastError: error.message,
          retryCount: queueItem.retryCount + 1,
        });
      }

      return false;
    }
  }

  /**
   * Sync all pending items
   */
  async syncPending(): Promise<SyncResult> {
    if (this.syncInProgress || this.status === 'offline') {
      return { success: false, synced: 0, failed: 0, errors: ['Sync skipped'] };
    }

    this.syncInProgress = true;
    this.setStatus('syncing');

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Get all pending items
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('pending')
        .toArray();

      for (const item of pendingItems) {
        const success = await this.syncQueueItem(item);
        if (success) {
          result.synced++;
        } else {
          result.failed++;
          result.success = false;
        }
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    } finally {
      this.syncInProgress = false;
      this.setStatus(navigator.onLine ? 'online' : 'offline');
    }

    console.log('[SyncManager] Sync completed:', result);
    return result;
  }

  /**
   * FC-522: Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    return Math.min(
      this.BASE_DELAY_MS * Math.pow(2, retryCount),
      30000 // Max 30 segundos
    );
  }

  /**
   * FC-522: Check if item should be retried
   */
  private shouldRetry(item: SyncQueueItem): boolean {
    return item.retryCount < this.MAX_RETRIES;
  }

  /**
   * Sync a single queue item with retry logic
   */
  private async syncQueueItem(item: SyncQueueItem): Promise<boolean> {
    // FC-522: Check if max retries exceeded
    if (!this.shouldRetry(item)) {
      console.warn(`[SyncManager] Max retries exceeded for ${item.entityType} ${item.entityId}`);
      await db.syncQueue.update(item.id, { status: 'failed' });
      return false;
    }

    // FC-522: Apply backoff delay if this is a retry
    if (item.retryCount > 0) {
      const delay = this.calculateBackoffDelay(item.retryCount);
      console.log(`[SyncManager] Retry ${item.retryCount}/${this.MAX_RETRIES} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // FC-523: Sync by entity type
    switch (item.entityType) {
      case 'message':
        return this.syncMessage(item.entityId);
      case 'conversation':
        return this.syncConversation(item.entityId);
      case 'relationship':
        return this.syncRelationship(item.entityId);
      default:
        console.warn('[SyncManager] Unknown entity type:', item.entityType);
        return false;
    }
  }

  /**
   * FC-523: Sync a conversation to backend
   */
  async syncConversation(conversationId: string): Promise<boolean> {
    if (!this.authToken) {
      console.warn('[SyncManager] No auth token, skipping conversation sync');
      return false;
    }

    const conversation = await db.conversations.get(conversationId);
    if (!conversation || conversation.syncState === 'synced') {
      return true;
    }

    try {
      await db.conversations.update(conversationId, { syncState: 'pending_backend' });

      const response = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          relationshipId: conversation.relationshipId,
          channel: conversation.channel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await db.conversations.update(conversationId, {
        syncState: 'synced',
        serverCreatedAt: new Date(),
        pendingOperation: undefined,
      });

      await db.syncQueue
        .where({ entityType: 'conversation', entityId: conversationId })
        .delete();

      console.log('[SyncManager] Conversation synced:', conversationId);
      return true;

    } catch (error: any) {
      console.error('[SyncManager] Conversation sync failed:', error);
      
      const queueItem = await db.syncQueue
        .where({ entityType: 'conversation', entityId: conversationId })
        .first();
      
      if (queueItem) {
        await db.syncQueue.update(queueItem.id, {
          status: 'failed',
          lastError: error.message,
          retryCount: queueItem.retryCount + 1,
        });
      }

      return false;
    }
  }

  /**
   * FC-523: Sync a relationship to backend
   */
  async syncRelationship(relationshipId: string): Promise<boolean> {
    if (!this.authToken) {
      console.warn('[SyncManager] No auth token, skipping relationship sync');
      return false;
    }

    const relationship = await db.relationships.get(relationshipId);
    if (!relationship || relationship.syncState === 'synced') {
      return true;
    }

    try {
      await db.relationships.update(relationshipId, { syncState: 'pending_backend' });

      const response = await fetch(`${API_URL}/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          accountAId: relationship.accountAId,
          accountBId: relationship.accountBId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await db.relationships.update(relationshipId, {
        syncState: 'synced',
        serverCreatedAt: new Date(),
        pendingOperation: undefined,
      });

      await db.syncQueue
        .where({ entityType: 'relationship', entityId: relationshipId })
        .delete();

      console.log('[SyncManager] Relationship synced:', relationshipId);
      return true;

    } catch (error: any) {
      console.error('[SyncManager] Relationship sync failed:', error);
      
      const queueItem = await db.syncQueue
        .where({ entityType: 'relationship', entityId: relationshipId })
        .first();
      
      if (queueItem) {
        await db.syncQueue.update(queueItem.id, {
          status: 'failed',
          lastError: error.message,
          retryCount: queueItem.retryCount + 1,
        });
      }

      return false;
    }
  }

  /**
   * Get messages for a conversation (from IndexedDB)
   */
  async getMessages(conversationId: string): Promise<LocalMessage[]> {
    return db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('localCreatedAt');
  }

  /**
   * Fetch and cache messages from backend
   * FIX: Deduplicación mejorada para evitar mensajes duplicados
   */
  async fetchMessages(conversationId: string): Promise<LocalMessage[]> {
    console.log(`[SyncManager] fetchMessages called for ${conversationId}, token: ${this.authToken ? 'present' : 'MISSING'}, status: ${this.status}`);
    
    if (!this.authToken || this.status === 'offline') {
      console.log('[SyncManager] Skipping fetch - no token or offline');
      return this.getMessages(conversationId);
    }

    try {
      const response = await fetch(
        `${API_URL}/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      // El endpoint devuelve { success: true, data: [...] }
      const serverMessages = json.data || json || [];
      
      console.log(`[SyncManager] Fetched ${serverMessages.length} messages for conversation ${conversationId}`);

      // FIX: Obtener todos los mensajes locales para deduplicación por contenido
      const localMessages = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .toArray();
      
      // Crear índice de mensajes locales por contenido+sender para detectar duplicados
      const localContentIndex = new Map<string, LocalMessage>();
      for (const msg of localMessages) {
        const key = `${msg.senderAccountId}:${msg.content?.text || ''}:${msg.type}`;
        localContentIndex.set(key, msg);
      }

      // Merge with local messages
      for (const serverMsg of serverMessages) {
        const existing = await db.messages.get(serverMsg.id);
        
        if (!existing) {
          // FIX: Verificar si existe un mensaje local con el mismo contenido (duplicado por sync)
          const contentKey = `${serverMsg.senderAccountId}:${serverMsg.content?.text || ''}:${serverMsg.type}`;
          const duplicateByContent = localContentIndex.get(contentKey);
          
          if (duplicateByContent && duplicateByContent.syncState !== 'synced') {
            // Es un duplicado local - actualizar el mensaje local con el ID del servidor
            console.log(`[SyncManager] Merging duplicate message: local ${duplicateByContent.id} -> server ${serverMsg.id}`);
            
            // Eliminar el mensaje local con ID diferente
            await db.messages.delete(duplicateByContent.id);
            
            // Agregar el mensaje del servidor (usar put para evitar ConstraintError)
            await db.messages.put({
              ...serverMsg,
              syncState: 'synced',
              localCreatedAt: new Date(serverMsg.createdAt),
              serverCreatedAt: new Date(serverMsg.createdAt),
            });
            
            // Limpiar sync queue del mensaje local
            await db.syncQueue
              .where({ entityType: 'message', entityId: duplicateByContent.id })
              .delete();
          } else {
            // New message from server - usar put para evitar ConstraintError si ya existe
            await db.messages.put({
              ...serverMsg,
              syncState: 'synced',
              localCreatedAt: new Date(serverMsg.createdAt),
              serverCreatedAt: new Date(serverMsg.createdAt),
            });
          }
        } else if (existing.syncState !== 'synced') {
          // FC-521: Conflict resolution - Backend prevalece (Dual Source of Truth)
          console.log(`[SyncManager] Resolving conflict for message ${serverMsg.id} - Backend wins`);
          await db.messages.update(serverMsg.id, {
            ...serverMsg,
            syncState: 'synced',
            serverCreatedAt: new Date(serverMsg.createdAt),
            pendingOperation: undefined,
          });
          
          // Remove from sync queue if exists
          await db.syncQueue
            .where({ entityType: 'message', entityId: serverMsg.id })
            .delete();
        } else {
          // Already synced - update if server version is newer
          const serverDate = new Date(serverMsg.createdAt);
          const localDate = existing.serverCreatedAt || existing.localCreatedAt;
          
          if (serverDate > localDate) {
            await db.messages.update(serverMsg.id, {
              ...serverMsg,
              syncState: 'synced',
              serverCreatedAt: serverDate,
            });
          }
        }
      }

      return this.getMessages(conversationId);

    } catch (error) {
      console.warn('[SyncManager] Fetch failed, using local:', error);
      return this.getMessages(conversationId);
    }
  }

  /**
   * Clear all local data
   */
  async clearLocalData(): Promise<void> {
    await db.messages.clear();
    await db.conversations.clear();
    await db.relationships.clear();
    await db.syncQueue.clear();
    console.log('[SyncManager] Local data cleared');
  }

  /**
   * FIX: Limpiar mensajes duplicados existentes en una conversación
   * Mantiene el mensaje más reciente (synced > local_only) y elimina duplicados
   */
  async cleanDuplicateMessages(conversationId: string): Promise<number> {
    const messages = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .toArray();
    
    // Agrupar por contenido+sender+type
    const groups = new Map<string, LocalMessage[]>();
    for (const msg of messages) {
      const key = `${msg.senderAccountId}:${msg.content?.text || ''}:${msg.type}`;
      const group = groups.get(key) || [];
      group.push(msg);
      groups.set(key, group);
    }
    
    let deletedCount = 0;
    
    // Para cada grupo con más de un mensaje, mantener solo el mejor
    for (const [, group] of groups) {
      if (group.length <= 1) continue;
      
      // Ordenar: synced primero, luego por fecha más reciente
      group.sort((a, b) => {
        if (a.syncState === 'synced' && b.syncState !== 'synced') return -1;
        if (b.syncState === 'synced' && a.syncState !== 'synced') return 1;
        return b.localCreatedAt.getTime() - a.localCreatedAt.getTime();
      });
      
      // Mantener el primero (mejor), eliminar el resto
      const toDelete = group.slice(1);
      for (const msg of toDelete) {
        await db.messages.delete(msg.id);
        await db.syncQueue
          .where({ entityType: 'message', entityId: msg.id })
          .delete();
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[SyncManager] Cleaned ${deletedCount} duplicate messages from conversation ${conversationId}`);
    }
    
    return deletedCount;
  }
}

// Singleton export
export const syncManager = new SyncManager();
