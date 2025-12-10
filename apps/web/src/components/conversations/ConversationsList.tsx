/**
 * ConversationsList - Lista de conversaciones activas
 * Conectada a API real - SIN DATOS MOCK
 */

import { useState, useEffect } from 'react';
import { Search, Plus, Loader2, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';

export function ConversationsList() {
  const {
    conversations,
    setConversations,
    selectedConversationId,
    setSelectedConversation,
  } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar conversaciones desde API real
  useEffect(() => {
    async function loadConversations() {
      setIsLoading(true);
      setError(null);
      
      const response = await api.getConversations();
      
      if (response.success && response.data) {
        setConversations(response.data);
      } else {
        setError(response.error || 'Error al cargar conversaciones');
        setConversations([]); // Limpiar cualquier dato previo
      }
      
      setIsLoading(false);
    }
    
    loadConversations();
  }, [setConversations]);

  // Filtrar conversaciones por búsqueda
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return conv.lastMessageText?.toLowerCase().includes(search) ||
           conv.channel.toLowerCase().includes(search);
  });

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

  // Colores canónicos para canales
  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return 'bg-success'; // Sistema canónico, no hardcoded
      case 'telegram':
        return 'bg-info'; // Sistema canónico
      default:
        return 'bg-muted'; // Sistema canónico
    }
  };

  const handleNewConversation = () => {
    // Ir a contactos para seleccionar con quién iniciar conversación
    const { setActiveActivity } = useUIStore.getState();
    setActiveActivity('contacts');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="w-full bg-elevated text-primary pl-10 pr-4 py-2 rounded-lg text-sm border border-subtle focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* New conversation button */}
      <div className="px-3 pb-3">
        <button 
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-inverse py-2 px-4 rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Nueva conversación
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-3 mb-3 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <MessageSquare size={48} className="text-muted mb-3" />
            <p className="text-muted text-sm">
              {searchQuery ? 'No se encontraron conversaciones' : 'No tienes conversaciones aún'}
            </p>
            <p className="text-muted text-xs mt-1">
              {!searchQuery && 'Usa el botón "Nueva conversación" para comenzar'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
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
                    {(conversation as any).contactName?.charAt(0).toUpperCase() || '?'}
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
                    {(conversation as any).contactName || `Chat ${conversation.id.slice(0, 8)}`}
                  </span>
                  <span className="text-xs text-muted">
                    {formatTime(conversation.lastMessageAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-secondary truncate">
                    {conversation.lastMessageText || 'Sin mensajes'}
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
