/**
 * ConversationsList - Lista de conversaciones activas
 * Conectada a API real - SIN DATOS MOCK
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Loader2, MessageSquare, Trash2, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../services/api';
import { Avatar } from '../ui/Avatar';
import { useScroll } from '../../hooks/useScroll';

export function ConversationsList() {
  const {
    conversations,
    setConversations,
    selectedConversationId,
    setSelectedConversation,
    selectedAccountId,
  } = useUIStore();

  const listRef = useRef<HTMLDivElement>(null);
  const lastLoadedAccountIdRef = useRef<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // UI-201: Dynamic scroll height
  const { maxHeight } = useScroll({ offset: 160 }); // Search (56) + Button (48) + Padding (56)

  // Cargar conversaciones desde API real
  useEffect(() => {
    async function loadConversations() {
      if (!selectedAccountId) {
        console.log('[ConversationsList] No account selected, skipping load');
        setConversations([]);
        setIsLoading(false);
        lastLoadedAccountIdRef.current = null;
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[ConversationsList] Loading conversations for account:', selectedAccountId);
        // MA-203: Pasar accountId para filtrar por cuenta específica
        const response = await api.getConversations(selectedAccountId);
        
        if (response.success && response.data) {
          console.log('[ConversationsList] Loaded conversations:', response.data.length);
          setConversations(response.data);
        } else {
          console.error('[ConversationsList] API error:', response.error);
          setError(response.error || 'Error al cargar conversaciones');
          setConversations([]); // Limpiar cualquier dato previo
        }
      } catch (error) {
        console.error('[ConversationsList] Exception:', error);
        setError('Error al cargar conversaciones');
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadConversations();
  }, [selectedAccountId, setConversations]);

  useEffect(() => {
    if (!selectedAccountId) return;
    if (isLoading) return;

    if (lastLoadedAccountIdRef.current !== selectedAccountId) {
      listRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      lastLoadedAccountIdRef.current = selectedAccountId;
    }
  }, [selectedAccountId, isLoading]);

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

  // Eliminar conversación
  const handleDeleteConversation = async (conversationId: string) => {
    setDeletingConvId(conversationId);
    try {
      const response = await api.deleteConversation(conversationId);
      if (response.success) {
        // Actualizar lista local
        setConversations(conversations.filter(c => c.id !== conversationId));
        // Limpiar selección si era esta conversación
        if (selectedConversationId === conversationId) {
          setSelectedConversation(null);
        }
        setConfirmDeleteId(null);
      } else {
        setError(response.error || 'Error al eliminar conversación');
      }
    } catch (err) {
      setError('Error al eliminar conversación');
    } finally {
      setDeletingConvId(null);
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
      <div ref={listRef} className="flex-1 overflow-y-auto" style={{ maxHeight }}>
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
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedConversation(conversation.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Abrir conversación ${(conversation as any).contactName || conversation.id}`}
              className={clsx(
                'w-full p-3 flex gap-3 hover:bg-hover transition-colors text-left group',
                selectedConversationId === conversation.id && 'bg-active'
              )}
            >
              {/* Avatar */}
              <div className="relative">
                <Avatar 
                  src={(conversation as any).contactAvatar}
                  name={(conversation as any).contactName}
                  size="lg"
                />
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

              {/* Delete button */}
              {confirmDeleteId === conversation.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conversation.id);
                    }}
                    disabled={deletingConvId === conversation.id}
                    className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                    title="Confirmar eliminación"
                  >
                    {deletingConvId === conversation.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(null);
                    }}
                    className="p-1.5 bg-elevated hover:bg-hover text-muted rounded transition-colors"
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(conversation.id);
                  }}
                  className="p-1.5 text-muted hover:text-red-500 hover:bg-hover rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Eliminar conversación"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
