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
   * Sync a single queue item
   */
  private async syncQueueItem(item: SyncQueueItem): Promise<boolean> {
    if (item.entityType === 'message') {
      return this.syncMessage(item.entityId);
    }
    
    // TODO: Add conversation and relationship sync
    console.warn('[SyncManager] Unknown entity type:', item.entityType);
    return false;
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
   */
  async fetchMessages(conversationId: string): Promise<LocalMessage[]> {
    if (!this.authToken || this.status === 'offline') {
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

      const serverMessages = await response.json();

      // Merge with local messages
      for (const serverMsg of serverMessages) {
        const existing = await db.messages.get(serverMsg.id);
        
        if (!existing) {
          // New message from server
          await db.messages.add({
            ...serverMsg,
            syncState: 'synced',
            localCreatedAt: new Date(serverMsg.createdAt),
            serverCreatedAt: new Date(serverMsg.createdAt),
          });
        } else if (existing.syncState !== 'synced') {
          // Resolve conflict - backend wins
          await db.messages.update(serverMsg.id, {
            ...serverMsg,
            syncState: 'synced',
            serverCreatedAt: new Date(serverMsg.createdAt),
            pendingOperation: undefined,
          });
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
}

// Singleton export
export const syncManager = new SyncManager();
