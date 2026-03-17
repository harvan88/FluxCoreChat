import { Navigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PublicProfileLayout } from './layouts/PublicProfileLayout';
import { ProfileChatBlockMobile } from './components/blocks/ProfileChatBlockMobile';
import { ProfileChatBlockDesktop } from './components/blocks/ProfileChatBlockDesktop';
import { useIsMobile } from '../hooks/useMediaQuery';

interface PublicProfile {
  id: string;
  displayName: string;
  alias: string;
  accountType: string;
  bio: string | null;
  avatarUrl: string | null;
  actorId: string | null;
}

export function PublicProfilePage() {
  const { alias } = useParams<{ alias: string }>();

  if (!alias) {
    return <Navigate to="/" />;
  }

  return <PublicProfileView alias={alias} />;
}

function PublicProfileView({ alias }: { alias: string }) {
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { getApiUrl } = await import('../utils/urls');
        const API_URL = getApiUrl();
        
        const response = await fetch(`${API_URL}/public/profiles/${encodeURIComponent(alias)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          // Convertir URLs de avatar a IP local si es necesario
          const profile = data.data;
          if (profile.avatarUrl && profile.avatarUrl.includes('localhost:3000')) {
            profile.avatarUrl = profile.avatarUrl.replace('localhost:3000', '192.168.0.179:3000');
          }
          setProfile(profile);
        } else {
          throw new Error(data.message || 'Invalid response');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (alias) {
      fetchProfile();
    }
  }, [alias]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-inverse font-bold text-3xl">F</span>
          </div>
          <p className="text-muted text-sm">Cargando identidad...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-error/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">Identidad no encontrada</h1>
          <p className="text-sm text-secondary mt-3 leading-relaxed">
            No pudimos localizar a <strong className="text-primary">@{alias}</strong> en la red FluxCore.
          </p>
          {error && (
            <p className="text-xs text-error mt-2 bg-error/10 p-2 rounded">
              Error: {error}
            </p>
          )}
          <a
            href="/"
            className="inline-block mt-8 px-6 py-3 rounded-xl bg-accent text-inverse text-sm font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }


  // Success state - Usar el chat público (sin autenticación)
  return (
    <PublicProfileLayout
      chatBlock={
        isMobile ? (
          <ProfileChatBlockMobile
            key={`mobile:${profile.alias}`}
            alias={profile.alias}
            conversationId=""
            accountId={undefined}
            profile={profile}
          />
        ) : (
          <ProfileChatBlockDesktop
            key={`desktop:${profile.alias}`}
            alias={profile.alias}
            conversationId=""
            accountId={undefined}
            profile={profile}
          />
        )
      }
    />
  );
}
