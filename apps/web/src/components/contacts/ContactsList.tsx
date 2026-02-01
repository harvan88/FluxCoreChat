/**
 * ContactsList - Lista de contactos (relaciones)
 * Conectada a API real - SIN DATOS MOCK
 */

import clsx from 'clsx';
import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Loader2, Users, X, Plus, Check, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { usePanelStore } from '../../store/panelStore';
import { Avatar } from '../ui';
import type { Relationship, Account } from '../../types';

export function ContactsList() {
  const [contacts, setContacts] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { selectedAccountId, conversations, setActiveActivity, loadConversations } = useUIStore();
  const { openTab } = usePanelStore();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Cargar contactos desde API real
  const loadContacts = useCallback(async (force = false) => {
    if (isLoading || (hasLoaded && !force)) return; // Prevent duplicate calls
    if (!selectedAccountId) {
      console.log('[ContactsList] No account selected, skipping load');
      setContacts([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // MA-204: Pasar accountId para filtrar por cuenta específica
      console.log('[ContactsList] Loading contacts for account:', selectedAccountId);
      const response = await api.getRelationships(selectedAccountId);
      
      if (response.success && response.data) {
        console.log('[ContactsList] Loaded contacts:', response.data.length);
        setContacts(response.data);
      } else {
        setError(response.error || 'Error al cargar contactos');
        setContacts([]);
      }
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [isLoading, hasLoaded, selectedAccountId]);

  useEffect(() => {
    if (!hasLoaded) {
      loadContacts();
    }
  }, [hasLoaded, loadContacts]);

  // MA-302: Reset hasLoaded cuando cambia la cuenta seleccionada
  useEffect(() => {
    console.log('[ContactsList] Account changed, resetting hasLoaded');
    setHasLoaded(false);
    setContacts([]);
  }, [selectedAccountId]);

  // Filtrar contactos por búsqueda local
  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      contact.accountBId?.toLowerCase().includes(search) ||
      contact.perspectiveA?.savedName?.toLowerCase().includes(search)
    );
  });

  const handleAddContact = () => {
    setShowAddModal(true);
  };

  const handleContactAdded = () => {
    setShowAddModal(false);
    loadContacts(true); // Forzar recarga
  };

  // Eliminar contacto
  const handleDeleteContact = async (contactId: string) => {
    setDeletingContactId(contactId);
    try {
      const response = await api.deleteContact(contactId);
      if (response.success) {
        // Recargar lista de contactos
        loadContacts(true);
        // Recargar conversaciones también
        loadConversations();
        setConfirmDeleteId(null);
      } else {
        setError(response.error || 'Error al eliminar contacto');
      }
    } catch (err) {
      setError('Error al eliminar contacto');
    } finally {
      setDeletingContactId(null);
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
            placeholder="Buscar contactos..."
            className="w-full bg-elevated text-primary pl-10 pr-4 py-2 rounded-lg text-sm border border-subtle focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Add contact button */}
      <div className="px-3 pb-3">
        <button 
          onClick={handleAddContact}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-inverse py-2 px-4 rounded-lg transition-colors text-sm font-medium"
        >
          <UserPlus size={18} />
          Agregar contacto
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
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Users size={48} className="text-muted mb-3" />
            <p className="text-muted text-sm">
              {searchQuery ? 'No se encontraron contactos' : 'No tienes contactos aún'}
            </p>
            <p className="text-muted text-xs mt-1">
              {!searchQuery && 'Usa el botón "Agregar contacto" para comenzar'}
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            // Usar contactName enriquecido del backend
            const displayName = (contact as any).contactName || 
              contact.perspectiveA?.savedName || 
              `Contacto ${contact.accountBId?.slice(0, 8)}`;
            
            return (
              <div
                key={contact.id}
                role="button"
                tabIndex={0}
                aria-disabled={isCreatingConversation}
                onClick={async () => {
                  if (isCreatingConversation) return;
                  // Buscar conversación existente con este contacto
                  let existingConv = conversations.find(
                    (c: any) => c.relationshipId === contact.id
                  );
                  
                  if (!existingConv) {
                    // Crear conversación si no existe
                    setIsCreatingConversation(true);
                    try {
                      const response = await api.createConversation({
                        relationshipId: contact.id,
                        channel: 'web',
                      });
                      
                      if (response.success && response.data) {
                        existingConv = response.data;
                        // Recargar conversaciones en el store
                        await loadConversations();
                      } else {
                        console.error('[ContactsList] Failed to create conversation:', response.error);
                        return;
                      }
                    } catch (err) {
                      console.error('[ContactsList] Error creating conversation:', err);
                      return;
                    } finally {
                      setIsCreatingConversation(false);
                    }
                  }
                  
                  if (existingConv) {
                    // Abrir conversación
                    setActiveActivity('conversations');
                    openTab('chats', {
                      type: 'chat',
                      title: displayName,
                      context: { chatId: existingConv.id },
                      closable: true,
                    });
                  }
                }}
                onKeyDown={async (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    await (event.currentTarget as HTMLDivElement).click();
                  }
                }}
                className={clsx(
                  'w-full p-3 flex gap-3 hover:bg-hover transition-colors text-left group cursor-pointer rounded-lg',
                  isCreatingConversation && 'opacity-60 pointer-events-none'
                )}
              >
                {/* Avatar - Bug 3 Fix: Usar Avatar component con imagen real */}
                {isCreatingConversation ? (
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-inverse" size={20} />
                  </div>
                ) : (
                  <Avatar
                    src={(contact as any).contactAvatar}
                    name={displayName}
                    size="lg"
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-primary font-medium truncate">
                    {displayName}
                  </div>
                  <div className="text-sm text-secondary">
                    {contact.perspectiveA?.status === 'active' ? 'Activo' : contact.perspectiveA?.status || 'Sin estado'}
                  </div>
                </div>

                {/* Delete button */}
                {confirmDeleteId === contact.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContact(contact.id);
                      }}
                      disabled={deletingContactId === contact.id}
                      className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                      title="Confirmar eliminación"
                    >
                      {deletingContactId === contact.id ? (
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
                      setConfirmDeleteId(contact.id);
                    }}
                    className="p-1.5 text-muted hover:text-red-500 hover:bg-hover rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar contacto"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Agregar Contacto */}
      {showAddModal && (
        <AddContactModal
          currentAccountId={selectedAccountId || ''}
          onClose={() => setShowAddModal(false)}
          onContactAdded={handleContactAdded}
        />
      )}
    </div>
  );
}

// ============================================================================
// AddContactModal - Modal para buscar y agregar contactos
// ============================================================================

interface AddContactModalProps {
  currentAccountId: string;
  onClose: () => void;
  onContactAdded: () => void;
}

function AddContactModal({ currentAccountId, onClose, onContactAdded }: AddContactModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Account[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Buscar usuarios en la API
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    const response = await api.searchAccounts(searchQuery);

    if (response.success && response.data) {
      // Filtrar para no mostrar la cuenta actual
      const filtered = response.data.filter(acc => acc.id !== currentAccountId);
      setSearchResults(filtered);
    } else {
      setError(response.error || 'Error en la búsqueda');
      setSearchResults([]);
    }

    setIsSearching(false);
  };

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Agregar contacto
  const handleAddContact = async (accountId: string) => {
    if (!currentAccountId) {
      setError('No hay cuenta activa');
      return;
    }

    setIsAdding(accountId);
    setError(null);

    const response = await api.addContact(currentAccountId, accountId);

    if (response.success) {
      setSuccessMessage('Contacto agregado exitosamente');
      setTimeout(() => {
        onContactAdded();
      }, 1000);
    } else {
      setError(response.error || 'Error al agregar contacto');
    }

    setIsAdding(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-subtle w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-primary">Agregar Contacto</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por @alias, nombre o email..."
              className="w-full bg-elevated text-primary pl-10 pr-4 py-3 rounded-lg text-sm border border-subtle focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted mt-2">
            Ingresa al menos 2 caracteres para buscar
          </p>
        </div>

        {/* Error/Success */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm flex items-center gap-2">
            <Check size={16} />
            {successMessage}
          </div>
        )}

        {/* Results */}
        <div className="max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              {searchQuery.length >= 2 ? 'No se encontraron usuarios' : 'Escribe para buscar usuarios'}
            </div>
          ) : (
            searchResults.map((account) => (
              <div
                key={account.id}
                className="p-4 flex items-center gap-3 hover:bg-hover transition-colors border-t border-subtle first:border-t-0"
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-inverse font-semibold text-sm">
                    {account.displayName?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-primary font-medium truncate">
                    {account.displayName}
                  </div>
                  <div className="text-xs text-muted">
                    @{account.username}
                  </div>
                </div>

                {/* Add button */}
                <button
                  onClick={() => handleAddContact(account.id)}
                  disabled={isAdding === account.id}
                  className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-inverse rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isAdding === account.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Agregar
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle">
          <button
            onClick={onClose}
            className="w-full py-2 text-secondary hover:text-primary transition-colors text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
