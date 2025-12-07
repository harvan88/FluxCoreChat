/**
 * V2-5: useChatOffline Hook
 * 
 * Combina useChat (API) con useOfflineMessages (IndexedDB) para soporte offline-first.
 * - Online: usa API real, guarda en IndexedDB
 * - Offline: usa IndexedDB, encola para sync
 */

import { useState, useEffect, useCallback } from 'react';
import { useChat } from './useChat';
import { useOfflineMessages, useConnectionStatus, useSync } from './useOfflineFirst';
import type { Message } from '../types';
import { db } from '../db';

interface UseChatOfflineOptions {
  conversationId: string;
  accountId: string;
}

export function useChatOffline({ conversationId, accountId }: UseChatOfflineOptions) {
  const connectionStatus = useConnectionStatus();
  const { sync, isSyncing } = useSync();
  const isOnline = connectionStatus === 'online';
  
  // Online chat hook
  const onlineChat = useChat({ conversationId, accountId });
  
  // Offline messages hook
  const offlineChat = useOfflineMessages(conversationId);

  // Combined messages - prefer online when connected
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Merge messages from both sources
  useEffect(() => {
    if (isOnline) {
      // Online: use API messages, but merge any pending offline
      const apiMessages = onlineChat.messages;
      const pendingOffline = offlineChat.messages.filter(
        m => m.syncState === 'pending_backend' || m.syncState === 'local_only'
      );
      
      // Merge and dedupe
      const merged = [...apiMessages];
      pendingOffline.forEach(offline => {
        if (!merged.find(m => m.id === offline.id)) {
          merged.push({
            id: offline.id,
            conversationId: offline.conversationId,
            senderAccountId: offline.senderAccountId,
            content: offline.content as any,
            type: offline.type,
            generatedBy: offline.generatedBy || 'human',
            status: offline.syncState === 'local_only' ? 'local_only' : 'pending_backend',
            createdAt: offline.localCreatedAt.toISOString(),
          });
        }
      });
      
      // Sort by date
      merged.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      setMessages(merged);
    } else {
      // Offline: use only IndexedDB
      setMessages(offlineChat.messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        senderAccountId: m.senderAccountId,
        content: m.content as any,
        type: m.type,
        generatedBy: m.generatedBy || 'human',
        status: m.syncState === 'synced' ? 'synced' : 'local_only',
        createdAt: m.localCreatedAt.toISOString(),
      })));
    }
  }, [isOnline, onlineChat.messages, offlineChat.messages]);

  // Send message - route based on connection
  const sendMessage = useCallback(async (params: {
    content: { text?: string };
    generatedBy?: 'human' | 'ai';
    replyToId?: string;
  }) => {
    if (isOnline) {
      // Online: use API, also save to IndexedDB
      const result = await onlineChat.sendMessage(params);
      
      if (result) {
        // Save to IndexedDB for offline access
        await db.messages.put({
          id: result.id,
          conversationId: result.conversationId,
          senderAccountId: result.senderAccountId,
          content: { text: result.content.text || '' },
          type: result.type,
          generatedBy: result.generatedBy,
          syncState: 'synced',
          localCreatedAt: new Date(result.createdAt),
          serverCreatedAt: new Date(result.createdAt),
        });
      }
      
      return result;
    } else {
      // Offline: save to IndexedDB, queue for sync
      const result = await offlineChat.sendMessage(
        accountId,
        { text: params.content.text || '' },
        'outgoing'
      );
      
      return {
        id: result.id,
        conversationId: result.conversationId,
        senderAccountId: result.senderAccountId,
        content: result.content,
        type: result.type,
        generatedBy: result.generatedBy || 'human',
        status: 'local_only' as const,
        createdAt: result.localCreatedAt.toISOString(),
      };
    }
  }, [isOnline, onlineChat, offlineChat, accountId]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      // Sync pending messages
      sync().then((result) => {
        if (result.synced > 0) {
          // Refresh messages after sync
          onlineChat.refresh();
        }
      });
    }
  }, [isOnline]);

  return {
    messages,
    isLoading: onlineChat.isLoading || offlineChat.isLoading,
    isSending: onlineChat.isSending,
    isSyncing,
    error: onlineChat.error || offlineChat.error,
    isOnline,
    connectionStatus,
    sendMessage,
    refresh: useCallback(() => {
      onlineChat.refresh();
      offlineChat.refresh();
    }, [onlineChat, offlineChat]),
    sync,
  };
}
