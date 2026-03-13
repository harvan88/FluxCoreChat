import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { UnifiedChatView } from '../components/chat/UnifiedChatView';
import { clearVisitorToken, getVisitorToken } from '../modules/visitor-token';
import { useAccountStore } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { PublicProfileHeader } from './PublicProfileHeader';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface PublicProfileData {
  id: string;
  displayName: string;
  alias: string;
  accountType: string;
  bio: string | null;
  avatarUrl: string | null;
  actorId?: string | null;
}

interface ConversationSummary {
  id: string;
  relationshipId: string | null;
}

export function PublicProfilePage() {
  const { alias } = useParams<{ alias: string }>();

  if (!alias) {
    return <Navigate to="/" />;
  }

  return <PublicProfileView alias={alias} />;
}

function PublicProfileView({ alias }: { alias: string }) {
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authenticatedConversationId, setAuthenticatedConversationId] = useState<string | null>(null);
  const [authenticatedRelationshipId, setAuthenticatedRelationshipId] = useState<string | null>(null);
  const [chatBootstrapError, setChatBootstrapError] = useState<string | null>(null);

  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeAccountId = useAccountStore((state) => state.activeAccountId);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);

      try {
        const response = await fetch(`${API_URL}/public/profiles/${encodeURIComponent(alias)}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error(result.message || 'Perfil no encontrado');
        }

        if (!cancelled) {
          setProfile(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setProfile(null);
          setProfileError(error instanceof Error ? error.message : 'Perfil no encontrado');
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [alias]);

  useEffect(() => {
    let cancelled = false;

    const resetAuthenticatedChat = () => {
      if (!cancelled) {
        setAuthenticatedConversationId(null);
        setAuthenticatedRelationshipId(null);
        setChatBootstrapError(null);
      }
    };

    if (!profile || !isAuthenticated || !token || !activeAccountId || activeAccountId === profile.id) {
      resetAuthenticatedChat();
      return () => {
        cancelled = true;
      };
    }

    const bootstrapAuthenticatedChat = async () => {
      try {
        setChatBootstrapError(null);

        const visitorToken = getVisitorToken();
        let relationshipId: string | null = null;
        let conversationId: string | null = null;

        if (visitorToken) {
          const convertResponse = await fetch(`${API_URL}/conversations/convert-visitor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              visitorToken,
              ownerAccountId: profile.id,
              visitorAccountId: activeAccountId,
            }),
          });

          const convertResult = await convertResponse.json();
          if (!convertResponse.ok || !convertResult.success) {
            throw new Error(convertResult.message || `HTTP ${convertResponse.status}`);
          }

          relationshipId = convertResult.data?.relationshipId || null;
          conversationId = convertResult.data?.conversation?.id || null;
          clearVisitorToken();
        } else {
          const relationshipResponse = await fetch(`${API_URL}/relationships`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              accountAId: activeAccountId,
              accountBId: profile.id,
            }),
          });

          const relationshipResult = await relationshipResponse.json();
          if (!relationshipResponse.ok || !relationshipResult.success) {
            throw new Error(relationshipResult.message || `HTTP ${relationshipResponse.status}`);
          }

          relationshipId = relationshipResult.data?.id || null;
        }

        if (!relationshipId) {
          throw new Error('No se pudo resolver la relación autenticada');
        }

        if (!conversationId) {
          const conversationsResponse = await fetch(`${API_URL}/conversations?accountId=${encodeURIComponent(activeAccountId)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const conversationsResult = await conversationsResponse.json();
          if (!conversationsResponse.ok || !conversationsResult.success) {
            throw new Error(conversationsResult.message || `HTTP ${conversationsResponse.status}`);
          }

          const authenticatedConversation = ((conversationsResult.data || []) as ConversationSummary[]).find(
            (conversation) => conversation.relationshipId === relationshipId
          );

          if (!authenticatedConversation?.id) {
            throw new Error('No se encontró la conversación autenticada');
          }

          conversationId = authenticatedConversation.id;
        }

        if (!cancelled) {
          setAuthenticatedRelationshipId(relationshipId);
          setAuthenticatedConversationId(conversationId);
        }
      } catch (error) {
        if (!cancelled) {
          setAuthenticatedConversationId(null);
          setAuthenticatedRelationshipId(null);
          setChatBootstrapError(error instanceof Error ? error.message : 'No se pudo preparar el chat autenticado');
        }
      }
    };

    bootstrapAuthenticatedChat();

    return () => {
      cancelled = true;
    };
  }, [activeAccountId, isAuthenticated, profile, token]);

  const shouldUseAuthenticatedChat = !!authenticatedConversationId && !!activeAccountId && activeAccountId !== profile?.id;
  const isBootstrappingAuthenticatedChat = !!profile && isAuthenticated && !!token && !!activeAccountId && activeAccountId !== profile.id && !authenticatedConversationId && !chatBootstrapError;

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-accent mx-auto" />
          <p className="text-sm text-muted mt-3">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Error / not found
  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-error" />
          </div>
          <h1 className="text-xl font-bold text-primary">Perfil no encontrado</h1>
          <p className="text-sm text-muted mt-2">
            No existe un perfil con el alias <strong className="text-primary">@{alias}</strong>.
            Verificá que la dirección sea correcta.
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-4 py-2 rounded-lg bg-accent text-inverse text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Branding bar */}
      <div className="bg-surface border-b border-subtle px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
            <span className="text-inverse font-bold text-xs">M</span>
          </div>
          <span className="text-xs text-muted">meetgar.com</span>
        </div>
        <a
          href="/login"
          className="text-xs text-accent hover:underline"
        >
          {isAuthenticated ? 'Abrir cuenta' : 'Iniciar sesión'}
        </a>
      </div>

      {/* Profile header */}
      <PublicProfileHeader profile={profile} isConnected={true} />

      {chatBootstrapError && (
        <div className="px-4 py-2 border-b border-subtle bg-warning/5 text-warning text-xs">
          {chatBootstrapError}
        </div>
      )}

      {isBootstrappingAuthenticatedChat ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <Loader2 size={28} className="animate-spin text-accent mx-auto" />
            <p className="text-sm text-muted mt-3">Preparando tu conversación autenticada...</p>
          </div>
        </div>
      ) : (
        <UnifiedChatView
          key={shouldUseAuthenticatedChat ? `auth:${authenticatedConversationId}` : `public:${profile.alias}`}
          conversationId={shouldUseAuthenticatedChat ? (authenticatedConversationId || '') : ''}
          accountId={shouldUseAuthenticatedChat ? (activeAccountId || undefined) : undefined}
          relationshipId={shouldUseAuthenticatedChat ? (authenticatedRelationshipId || undefined) : undefined}
          publicAlias={shouldUseAuthenticatedChat ? undefined : profile.alias}
          profile={profile}
        />
      )}
    </div>
  );
}
