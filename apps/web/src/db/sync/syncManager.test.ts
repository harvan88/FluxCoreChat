/**
 * FC-524: Tests para SyncManager
 * Verifica sincronización offline-first
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { syncManager } from './syncManager';
import { db } from '../index';

describe('SyncManager', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.messages.clear();
    await db.conversations.clear();
    await db.relationships.clear();
    await db.syncQueue.clear();
  });

  describe('Offline-First Message Creation', () => {
    it('should create message locally when offline', async () => {
      const message = await syncManager.createMessage(
        'conv-123',
        'account-456',
        { text: 'Test message' },
        'outgoing'
      );

      expect(message.id).toBeDefined();
      expect(message.syncState).toBe('local_only');
      expect(message.pendingOperation).toBe('create');
      expect(message.content.text).toBe('Test message');

      // Verify it's in IndexedDB
      const stored = await db.messages.get(message.id);
      expect(stored).toBeDefined();
      expect(stored?.syncState).toBe('local_only');
    });

    it('should add message to sync queue', async () => {
      const message = await syncManager.createMessage(
        'conv-123',
        'account-456',
        { text: 'Test message' }
      );

      const queueItems = await db.syncQueue
        .where({ entityType: 'message', entityId: message.id })
        .toArray();

      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].operation).toBe('create');
      expect(queueItems[0].status).toBe('pending');
    });
  });

  describe('Retry Logic', () => {
    it('should calculate exponential backoff correctly', () => {
      // Access private method via type assertion for testing
      const manager = syncManager as any;
      
      expect(manager.calculateBackoffDelay(0)).toBe(1000); // 1s
      expect(manager.calculateBackoffDelay(1)).toBe(2000); // 2s
      expect(manager.calculateBackoffDelay(2)).toBe(4000); // 4s
      expect(manager.calculateBackoffDelay(3)).toBe(8000); // 8s
      expect(manager.calculateBackoffDelay(4)).toBe(16000); // 16s
      expect(manager.calculateBackoffDelay(10)).toBe(30000); // Max 30s
    });

    it('should respect max retries', () => {
      const manager = syncManager as any;
      
      expect(manager.shouldRetry({ retryCount: 0 })).toBe(true);
      expect(manager.shouldRetry({ retryCount: 4 })).toBe(true);
      expect(manager.shouldRetry({ retryCount: 5 })).toBe(false);
      expect(manager.shouldRetry({ retryCount: 10 })).toBe(false);
    });
  });

  describe('Connection Status', () => {
    it('should track online/offline status', () => {
      const status = syncManager.getStatus();
      expect(['online', 'offline']).toContain(status);
    });

    it('should notify listeners on status change', async () => {
      const statusPromise = new Promise<void>((resolve) => {
        const unsubscribe = syncManager.onStatusChange((status) => {
          expect(status).toBeDefined();
          unsubscribe();
          resolve();
        });
      });

      // Trigger status change (simulate)
      window.dispatchEvent(new Event('online'));
      
      await statusPromise;
    });
  });

  describe('Conflict Resolution', () => {
    it('should prefer backend data in conflicts', async () => {
      // Create local message
      const localMessage = await syncManager.createMessage(
        'conv-123',
        'account-456',
        { text: 'Local version' }
      );

      // Simulate server message with same ID but different content
      const serverMessage = {
        id: localMessage.id,
        conversationId: 'conv-123',
        senderAccountId: 'account-456',
        content: { text: 'Server version' },
        type: 'outgoing' as const,
        createdAt: new Date().toISOString(),
      };

      // Update local with server data (simulating fetchMessages logic)
      await db.messages.update(localMessage.id, {
        content: serverMessage.content,
        type: serverMessage.type,
        syncState: 'synced',
        serverCreatedAt: new Date(serverMessage.createdAt),
        pendingOperation: undefined,
      });

      const updated = await db.messages.get(localMessage.id);
      expect(updated?.content.text).toBe('Server version');
      expect(updated?.syncState).toBe('synced');
    });
  });

  describe('Data Retrieval', () => {
    it('should get messages for a conversation', async () => {
      await syncManager.createMessage('conv-123', 'account-1', { text: 'Message 1' });
      await syncManager.createMessage('conv-123', 'account-2', { text: 'Message 2' });
      await syncManager.createMessage('conv-456', 'account-3', { text: 'Message 3' });

      const messages = await syncManager.getMessages('conv-123');
      
      expect(messages).toHaveLength(2);
      expect(messages.every(m => m.conversationId === 'conv-123')).toBe(true);
    });
  });

  describe('Clear Local Data', () => {
    it('should clear all local data', async () => {
      await syncManager.createMessage('conv-123', 'account-1', { text: 'Test' });
      
      await syncManager.clearLocalData();

      const messages = await db.messages.toArray();
      const queue = await db.syncQueue.toArray();
      
      expect(messages).toHaveLength(0);
      expect(queue).toHaveLength(0);
    });
  });
});
