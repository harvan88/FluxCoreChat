/**
 * ViewPort - Área de contenido principal con soporte multi-container
 * TOTEM PARTE 11: Panel & Tab System
 */

import { useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { usePanelStore, useContainers } from '../../store/panelStore';
import { DynamicContainer } from '../panels';
import { WelcomeView } from '../chat/WelcomeView';

export function ViewPort() {
  const { selectedConversationId, activeActivity, setSelectedConversation } = useUIStore();
  const containers = useContainers();
  const { layout, openTab, activateTab, focusContainer } = usePanelStore();
  
  // FIX: Ref para evitar race condition con tabs duplicados
  const processingRef = useRef<string | null>(null);

  // Efecto para abrir chat cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversationId && activeActivity === 'conversations') {
      // FIX: Evitar procesar la misma conversación múltiples veces
      if (processingRef.current === selectedConversationId) {
        return;
      }
      processingRef.current = selectedConversationId;
      
      // FC-401: Verificar si ya existe un tab para este chat
      const existingTab = containers
        .flatMap(c => c.tabs.map(t => ({ tab: t, containerId: c.id })))
        .find(({ tab }) => tab.type === 'chat' && tab.context.chatId === selectedConversationId);
      
      if (existingTab) {
        // Activar tab existente
        activateTab(existingTab.containerId, existingTab.tab.id);
        focusContainer(existingTab.containerId);
      } else {
        // Crear nuevo tab
        openTab('chats', {
          type: 'chat',
          title: `Chat`,
          context: { chatId: selectedConversationId },
          closable: true,
        });
      }

      // Evitar loops de render: limpiamos la selección una vez manejada
      setSelectedConversation(null);
      
      // FIX: Limpiar ref después de un pequeño delay para permitir re-selección
      setTimeout(() => {
        processingRef.current = null;
      }, 100);
    }
  }, [selectedConversationId, activeActivity, openTab, containers, activateTab, focusContainer, setSelectedConversation]);

  // FC-402 & FC-403: Settings ahora se maneja desde Sidebar
  // El flujo correcto es: ActivityBar → Sidebar (SettingsPanel) → DynamicContainer
  // Ya no abrimos container automáticamente desde aquí

  // Si no hay containers, mostrar welcome
  if (containers.length === 0) {
    return (
      <div className="flex-1 bg-base">
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
        flex-1 flex gap-1 p-1 bg-base overflow-hidden
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
