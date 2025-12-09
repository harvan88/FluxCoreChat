/**
 * ConversationsList - Lista de conversaciones activas
 */

import { useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import type { Conversation } from '../../types';

export function ConversationsList() {
  const {
    conversations,
    setConversations,
    selectedConversationId,
    setSelectedConversation,
  } = useUIStore();

  useEffect(() => {
    // TODO: Cargar conversaciones desde la API
    // Por ahora usamos datos de ejemplo
    const mockConversations: Conversation[] = [
      {
        id: '1',
        relationshipId: 'r1',
        channel: 'web',
        status: 'active',
        lastMessageAt: new Date().toISOString(),
        lastMessageText: '¡Hola! ¿Cómo estás?',
        unreadCountA: 2,
        unreadCountB: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        relationshipId: 'r2',
        channel: 'whatsapp',
        status: 'active',
        lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
        lastMessageText: 'Perfecto, nos vemos mañana',
        unreadCountA: 0,
        unreadCountB: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    setConversations(mockConversations);
  }, [setConversations]);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 86400000) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    }
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return 'bg-green-600';
      case 'telegram':
        return 'bg-blue-500';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            className="w-full bg-elevated text-primary pl-10 pr-4 py-2 rounded-lg text-sm border border-subtle focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* New conversation button */}
      <div className="px-3 pb-3">
        <button className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-inverse py-2 px-4 rounded-lg transition-colors text-sm font-medium">
          <Plus size={18} />
          Nueva conversación
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted">
            No hay conversaciones
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={clsx(
                'w-full p-3 flex gap-3 hover:bg-hover transition-colors text-left',
                selectedConversationId === conversation.id && 'bg-active'
              )}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-inverse font-semibold text-sm">
                    {conversation.id === '1' ? 'JP' : 'MA'}
                  </span>
                </div>
                <div
                  className={clsx(
                    'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface',
                    getChannelBadge(conversation.channel)
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-primary font-medium truncate">
                    {conversation.id === '1' ? 'Juan Pérez' : 'María Gómez'}
                  </span>
                  <span className="text-xs text-muted">
                    {formatTime(conversation.lastMessageAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-secondary truncate">
                    {conversation.lastMessageText}
                  </span>
                  {conversation.unreadCountA > 0 && (
                    <span className="ml-2 bg-accent text-inverse text-xs px-2 py-0.5 rounded-full">
                      {conversation.unreadCountA}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
