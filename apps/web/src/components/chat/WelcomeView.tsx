/**
 * WelcomeView - Vista de bienvenida cuando no hay conversación seleccionada
 * TOTEM: Estado "Vacío" del ViewPort
 */

import { MessageSquare, Users, Puzzle, ArrowLeft } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

export function WelcomeView() {
  const { setActiveActivity, setSidebarOpen } = useUIStore();

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
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-2xl">
            <span className="text-inverse font-bold text-4xl">F</span>
          </div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-3xl font-bold text-primary mb-3">
          Bienvenido a FluxCore
        </h1>
        <p className="text-secondary mb-8 leading-relaxed">
          Selecciona una conversación o contacto para comenzar.
          <br />
          Tu plataforma de mensajería con IA integrada.
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
