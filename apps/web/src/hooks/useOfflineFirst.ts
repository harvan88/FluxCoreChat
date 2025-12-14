/**
 * C3: Offline-First - React Hook
 * 
 * Hook para usar mensajes con soporte offline-first.
 */

import { useState, useEffect, useCallback } from 'react';
import { db, type LocalMessage } from '../db';
import { syncManager, type ConnectionStatus } from '../db/sync';

/**
 * Hook para mensajes con soporte offline
 */
export function useOfflineMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages from IndexedDB
  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      // FIX: Limpiar duplicados antes de cargar
      await syncManager.cleanDuplicateMessages(conversationId);
      
      const localMessages = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('localCreatedAt');
      setMessages(localMessages);
    } catch (err: any) {
      console.error('[useOfflineMessages] Load error:', err);
    }
  }, [conversationId]);

  // Fetch messages from backend on mount
  useEffect(() => {
    if (!conversationId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await syncManager.fetchMessages(conversationId);
        await loadMessages();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [conversationId, loadMessages]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (
    senderAccountId: string,
    content: LocalMessage['content'],
    type: 'incoming' | 'outgoing' | 'system' = 'outgoing'
  ) => {
    if (!conversationId) {
      throw new Error('No conversation selected');
    }

    try {
      const newMessage = await syncManager.createMessage(
        conversationId,
        senderAccountId,
        content,
        type
      );
      
      // Update local state immediately (optimistic) - evitar duplicados
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      
      return newMessage;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [conversationId]);

  // Refresh messages - con deduplicación
  const refresh = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      // Fetch del backend primero
      await syncManager.fetchMessages(conversationId);
      // Luego cargar de IndexedDB (ya deduplicado por syncManager)
      await loadMessages();
    } catch (err) {
      console.error('[useOfflineMessages] Refresh error:', err);
      // Fallback: solo cargar local
      await loadMessages();
    }
  }, [conversationId, loadMessages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refresh,
  };
}

/**
 * Hook para estado de conexión
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(syncManager.getStatus());

  useEffect(() => {
    return syncManager.onStatusChange(setStatus);
  }, []);

  return status;
}

/**
 * Hook para sincronización manual
 */
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    synced: number;
    failed: number;
  } | null>(null);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncManager.syncPending();
      setLastSyncResult({
        success: result.success,
        synced: result.synced,
        failed: result.failed,
      });
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    sync,
    isSyncing,
    lastSyncResult,
  };
}

/**
 * Hook para estadísticas de sync queue
 */
export function useSyncQueueStats() {
  const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0 });

  const loadStats = useCallback(async () => {
    try {
      const all = await db.syncQueue.toArray();
      setStats({
        pending: all.filter(i => i.status === 'pending').length,
        failed: all.filter(i => i.status === 'failed').length,
        total: all.length,
      });
    } catch (err) {
      console.error('[useSyncQueueStats] Error:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // Refresh every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return { ...stats, refresh: loadStats };
}
