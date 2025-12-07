/**
 * C3: Offline-First - Sync Queue
 * 
 * Gestiona la cola de operaciones pendientes de sincronización.
 */

import { db, type SyncQueueItem } from '../index';

/**
 * Sync Queue Manager
 */
class SyncQueueManager {
  /**
   * Add item to queue
   */
  async enqueue(
    entityType: SyncQueueItem['entityType'],
    entityId: string,
    operation: SyncQueueItem['operation'],
    payload: unknown
  ): Promise<string> {
    // Check if already in queue
    const existing = await db.syncQueue
      .where({ entityType, entityId })
      .first();

    if (existing) {
      // Update existing
      await db.syncQueue.update(existing.id, {
        operation,
        payload,
        status: 'pending',
        retryCount: 0,
        lastError: undefined,
      });
      return existing.id;
    }

    // Add new
    const id = crypto.randomUUID();
    await db.syncQueue.add({
      id,
      entityType,
      entityId,
      operation,
      status: 'pending',
      payload,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
    });
    return id;
  }

  /**
   * Get pending items
   */
  async getPending(): Promise<SyncQueueItem[]> {
    return db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();
  }

  /**
   * Get failed items that can be retried
   */
  async getRetryable(): Promise<SyncQueueItem[]> {
    const failed = await db.syncQueue
      .where('status')
      .equals('failed')
      .toArray();

    return failed.filter(item => item.retryCount < item.maxRetries);
  }

  /**
   * Mark item as processing
   */
  async markProcessing(id: string): Promise<void> {
    await db.syncQueue.update(id, { status: 'processing' });
  }

  /**
   * Mark item as completed
   */
  async markCompleted(id: string): Promise<void> {
    await db.syncQueue.update(id, {
      status: 'completed',
      processedAt: new Date(),
    });
  }

  /**
   * Mark item as failed
   */
  async markFailed(id: string, error: string): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (!item) return;

    await db.syncQueue.update(id, {
      status: 'failed',
      lastError: error,
      retryCount: item.retryCount + 1,
    });
  }

  /**
   * Remove completed items older than given hours
   */
  async cleanupCompleted(hoursOld: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    
    return db.syncQueue
      .where('status')
      .equals('completed')
      .filter(item => item.processedAt! < cutoff)
      .delete();
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    completed: number;
  }> {
    const all = await db.syncQueue.toArray();
    
    return {
      pending: all.filter(i => i.status === 'pending').length,
      processing: all.filter(i => i.status === 'processing').length,
      failed: all.filter(i => i.status === 'failed').length,
      completed: all.filter(i => i.status === 'completed').length,
    };
  }

  /**
   * Remove item from queue
   */
  async remove(entityType: string, entityId: string): Promise<void> {
    await db.syncQueue
      .where({ entityType, entityId })
      .delete();
  }

  /**
   * Clear entire queue
   */
  async clear(): Promise<void> {
    await db.syncQueue.clear();
  }
}

// Singleton export
export const syncQueue = new SyncQueueManager();
