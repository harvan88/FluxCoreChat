import { useParams, Navigate } from 'react-router-dom';
import { usePublicChat } from './hooks/usePublicChat';
import { PublicProfileHeader } from './PublicProfileHeader';
import { PublicChatContainer } from './PublicChatContainer';
import { Loader2, AlertCircle } from 'lucide-react';

export function PublicProfilePage() {
  const { alias } = useParams<{ alias: string }>();

  if (!alias) {
    return <Navigate to="/" />;
  }

  return <PublicProfileView alias={alias} />;
}

function PublicProfileView({ alias }: { alias: string }) {
  const {
    profile,
    profileLoading,
    profileError,
    messages,
    sendMessage,
    isConnected,
  } = usePublicChat({ alias });

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
          Iniciar sesión
        </a>
      </div>

      {/* Profile header */}
      <PublicProfileHeader profile={profile} isConnected={isConnected} />

      {/* Chat area — fills remaining space */}
      <PublicChatContainer
        profile={profile}
        messages={messages}
        isConnected={isConnected}
        onSendMessage={sendMessage}
      />
    </div>
  );
}
