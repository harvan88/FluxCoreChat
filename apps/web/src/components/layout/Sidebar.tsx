/**
 * Sidebar - Panel lateral con contenido según la actividad seleccionada
 * TOTEM: Especificación Canónica de Comportamiento de Interfaz
 * 
 * Estados:
 * - Cerrado/Oculto: No visible
 * - Abierto/Expandido: Visible con contenido
 * - Fijado/Pinned: Permanece visible (candado activado)
 */

import { Lock, LockOpen } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { ConversationsList } from '../conversations/ConversationsList';
import { ContactsList } from '../contacts/ContactsList';
import { SettingsPanel } from '../settings/SettingsPanel';
import { ExtensionsPanel } from '../extensions';

export function Sidebar() {
  const { 
    activeActivity, 
    sidebarOpen, 
    sidebarPinned,
    selectedAccountId,
    toggleSidebarPinned,
    isMobile,
  } = useUIStore();

  const renderContent = () => {
    switch (activeActivity) {
      case 'conversations':
        return <ConversationsList />;
      case 'contacts':
        return <ContactsList />;
      case 'extensions':
        return <ExtensionsPanel accountId={selectedAccountId || ''} />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (activeActivity) {
      case 'conversations':
        return 'Conversaciones';
      case 'contacts':
        return 'Contactos';
      case 'extensions':
        return 'Extensiones';
      case 'settings':
        return 'Configuración';
      default:
        return '';
    }
  };

  // En móvil, el sidebar se muestra dentro del drawer sin animaciones propias
  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-elevated">
        {/* Header simple para móvil */}
        <div className="h-12 px-4 flex items-center border-b border-subtle flex-shrink-0">
          <h2 className="text-base font-semibold text-primary truncate">
            {getTitle()}
          </h2>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    );
  }

  // Desktop: sidebar con animaciones y controles completos
  return (
    <div 
      className={clsx(
        'bg-surface border-r border-subtle flex flex-col transition-all duration-300 ease-in-out overflow-hidden',
        sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'
      )}
    >
      {/* Header con controles */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-subtle flex-shrink-0">
        <h2 className="text-lg font-semibold text-primary truncate">
          {getTitle()}
        </h2>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Pin/Lock toggle */}
          <button
            onClick={toggleSidebarPinned}
            className={clsx(
              'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
              sidebarPinned
                ? 'text-accent bg-accent-muted'
                : 'text-secondary hover:text-primary hover:bg-hover'
            )}
            title={sidebarPinned ? 'Desfijar sidebar' : 'Fijar sidebar'}
          >
            {sidebarPinned ? <Lock size={16} /> : <LockOpen size={16} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-w-[320px]">
        {renderContent()}
      </div>
    </div>
  );
}
