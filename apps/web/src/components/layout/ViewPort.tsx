/**
 * ViewPort - Área de contenido principal con soporte multi-container
 * TOTEM PARTE 11: Panel & Tab System
 */

import { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { usePanelStore, useContainers } from '../../store/panelStore';
import { DynamicContainer } from '../panels';
import { WelcomeView } from '../chat/WelcomeView';

export function ViewPort() {
  const { selectedConversationId, activeActivity } = useUIStore();
  const containers = useContainers();
  const { layout, openTab, openContainer } = usePanelStore();

  // Efecto para abrir chat cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversationId && activeActivity === 'conversations') {
      openTab('chats', {
        type: 'chat',
        title: `Chat`,
        context: { chatId: selectedConversationId },
        closable: true,
      });
    }
  }, [selectedConversationId, activeActivity, openTab]);

  // Efecto para abrir settings
  useEffect(() => {
    if (activeActivity === 'settings') {
      const existingSettings = containers.find(c => c.type === 'settings');
      if (!existingSettings) {
        openContainer('settings', {
          initialTabs: [{
            type: 'settings',
            title: 'Configuración',
            context: {},
            closable: false,
          }],
        });
      }
    }
  }, [activeActivity, containers, openContainer]);

  // Si no hay containers, mostrar welcome
  if (containers.length === 0) {
    return (
      <div className="flex-1 bg-gray-900">
        <WelcomeView />
      </div>
    );
  }

  // Renderizar containers según el split direction
  const sortedContainers = [...containers].sort(
    (a, b) => a.position.order - b.position.order
  );

  return (
    <div 
      className={`
        flex-1 flex gap-1 p-1 bg-gray-950 overflow-hidden
        ${layout.splitDirection === 'horizontal' ? 'flex-row' : 'flex-col'}
      `}
    >
      {sortedContainers.map((container) => (
        <div 
          key={container.id}
          className="flex-1 min-w-0 min-h-0"
          style={{
            flex: container.position.width 
              ? `0 0 ${container.position.width}px` 
              : '1 1 0%',
          }}
        >
          <DynamicContainer
            container={container}
            isActive={container.id === layout.focusedContainerId}
          />
        </div>
      ))}
    </div>
  );
}
