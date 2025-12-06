/**
 * Sidebar - Panel lateral con contenido según la actividad seleccionada
 */

import { useUIStore } from '../../store/uiStore';
import { ConversationsList } from '../conversations/ConversationsList';
import { ContactsList } from '../contacts/ContactsList';
import { SettingsPanel } from '../settings/SettingsPanel';

export function Sidebar() {
  const { activeActivity, sidebarOpen } = useUIStore();

  if (!sidebarOpen) return null;

  const renderContent = () => {
    switch (activeActivity) {
      case 'conversations':
        return <ConversationsList />;
      case 'contacts':
        return <ContactsList />;
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
      case 'settings':
        return 'Configuración';
      default:
        return '';
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">{getTitle()}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
