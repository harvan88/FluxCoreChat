/**
 * ViewPort - Área de contenido principal
 */

import { useUIStore } from '../../store/uiStore';
import { ChatView } from '../chat/ChatView';
import { WelcomeView } from '../chat/WelcomeView';

export function ViewPort() {
  const { selectedConversationId, activeActivity } = useUIStore();

  // Si estamos en settings, no mostramos chat
  if (activeActivity === 'settings') {
    return (
      <div className="flex-1 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Selecciona una opción del panel lateral</p>
        </div>
      </div>
    );
  }

  // Si no hay conversación seleccionada
  if (!selectedConversationId) {
    return <WelcomeView />;
  }

  return <ChatView conversationId={selectedConversationId} />;
}
