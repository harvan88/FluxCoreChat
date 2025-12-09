/**
 * WelcomeView - Vista de bienvenida cuando no hay conversación seleccionada
 * TOTEM: Estado "Vacío" del ViewPort
 * Incluye mensaje de Fluxi (FC-840)
 */

import { MessageSquare, Users, Puzzle, ArrowLeft } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { FluxiAvatar } from '../onboarding';

export function WelcomeView() {
  const { setActiveActivity, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();

  const handleExploreConversations = () => {
    setActiveActivity('conversations');
    setSidebarOpen(true);
  };

  const handleViewContacts = () => {
    setActiveActivity('contacts');
    setSidebarOpen(true);
  };

  const handleExploreExtensions = () => {
    setActiveActivity('extensions');
    setSidebarOpen(true);
  };

  return (
    <div className="flex-1 bg-base flex items-center justify-center p-8">
      <div className="text-center max-w-lg">
        {/* Fluxi Avatar */}
        <div className="mb-6 flex justify-center">
          <FluxiAvatar size="xl" />
        </div>

        {/* Welcome Text */}
        <h1 className="text-3xl font-bold text-primary mb-3">
          ¡Hola{user?.name ? `, ${user.name}` : ''}! 👋
        </h1>
        <p className="text-secondary mb-2 leading-relaxed">
          Soy <strong className="text-accent">Fluxi</strong>, tu asistente en FluxCore.
        </p>
        <p className="text-muted mb-8 leading-relaxed">
          Selecciona una conversación o contacto para comenzar.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={handleExploreConversations}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-inverse font-medium rounded-lg transition-colors"
          >
            <MessageSquare size={20} />
            Explorar conversaciones
          </button>
          <button
            onClick={handleViewContacts}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-elevated hover:bg-hover text-primary font-medium rounded-lg border border-default transition-colors"
          >
            <Users size={20} />
            Ver contactos
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <button
            onClick={handleExploreExtensions}
            className="inline-flex items-center gap-1.5 text-secondary hover:text-primary transition-colors"
          >
            <Puzzle size={16} />
            Explorar extensiones
          </button>
        </div>

        {/* Hint */}
        <div className="mt-10 flex items-center justify-center gap-2 text-muted text-sm">
          <ArrowLeft size={16} />
          <span>O haz clic en el sidebar para ver opciones disponibles</span>
        </div>
      </div>
    </div>
  );
}
