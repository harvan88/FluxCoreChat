import { useState, useEffect } from 'react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { MessageSquare, Edit3, User, Clock, MessageCircle } from 'lucide-react';
import type { Account, Relationship } from '@fluxcore/types';

interface ContactDetailsProps {
  contactId: string;
  onStartChat?: (contactId: string) => void;
  onEditContext?: (contactId: string) => void;
}

interface Interaction {
  id: string;
  type: 'message' | 'context_update' | 'status_change';
  timestamp: string;
  content: string;
  author?: string;
}

export function ContactDetails({ contactId, onStartChat, onEditContext }: ContactDetailsProps) {
  const [contact, setContact] = useState<Account | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContactData();
  }, [contactId]);

  const loadContactData = async () => {
    try {
      setLoading(true);
      
      // Load contact account info
      const accountRes = await fetch(`/api/accounts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (accountRes.ok) {
        const accountData = await accountRes.json();
        setContact(accountData);
      }

      // Load relationship and interactions
      const interactionsRes = await fetch(`/api/contacts/${contactId}/interactions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (interactionsRes.ok) {
        const data = await interactionsRes.json();
        setRelationship(data.relationship);
        setInteractions(data.interactions || []);
      }
    } catch (error) {
      console.error('Error loading contact details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">Contacto no encontrado</p>
      </div>
    );
  }

  const profile = contact.profile as { avatarUrl?: string; bio?: string } | null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border p-6">
        <div className="flex items-start gap-4">
          <Avatar 
            src={profile?.avatarUrl} 
            name={contact.displayName} 
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-primary truncate">
              {contact.displayName}
            </h2>
            <p className="text-sm text-muted">@{contact.username}</p>
            {profile?.bio && (
              <p className="text-sm text-secondary mt-2">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onStartChat?.(contactId)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Iniciar Chat
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEditContext?.(contactId)}
            className="flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Editar Contexto
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Ver Perfil
          </Button>
        </div>
      </div>

      {/* Interactions Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Interacciones Recientes
        </h3>

        {interactions.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No hay interacciones recientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interactions.slice(0, 10).map((interaction) => (
              <div
                key={interaction.id}
                className="p-3 rounded-lg bg-surface border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-primary capitalize">
                    {interaction.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(interaction.timestamp).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-secondary line-clamp-2">
                  {interaction.content}
                </p>
                {interaction.author && (
                  <p className="text-xs text-muted mt-1">Por: {interaction.author}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Relationship Context */}
        {relationship && (
          <div className="mt-6 p-4 rounded-lg bg-surface border border-border">
            <h4 className="text-sm font-semibold text-primary mb-2">Contexto de Relación</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted">Estado:</span>{' '}
                <span className="text-secondary capitalize">
                  {(relationship as any).status || 'active'}
                </span>
              </div>
              <div>
                <span className="text-muted">Última interacción:</span>{' '}
                <span className="text-secondary">
                  {relationship.lastInteraction
                    ? new Date(relationship.lastInteraction).toLocaleDateString('es-ES')
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
