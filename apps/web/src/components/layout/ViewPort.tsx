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
  const { selectedConversationId, activeActivity, selectedAccountId, setSelectedConversation, setActiveConversation, conversations } = useUIStore();
  const containers = useContainers();
  const { layout, openTab, activateTab, focusContainer, closeTab } = usePanelStore();

  // FIX: Ref para evitar race condition con tabs duplicados
  const processingRef = useRef<string | null>(null);
  const previousAccountIdRef = useRef<string | null>(null);

  // 13R: Cerrar tabs cross-account al cambiar de cuenta
  useEffect(() => {
    if (selectedAccountId && previousAccountIdRef.current && previousAccountIdRef.current !== selectedAccountId) {
      // La cuenta cambió - cerrar tabs que no pertenecen a la nueva cuenta
      containers.forEach(container => {
        container.tabs.forEach(tab => {
          // Verificar si el tab tiene contexto de cuenta específica
          if (tab.context.accountId && tab.context.accountId !== selectedAccountId) {
            closeTab(container.id, tab.id);
          }
        });
      });
    }
    previousAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId, containers, closeTab]);

  // Efecto para abrir chat cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversationId && activeActivity === 'conversations') {
      const selectedConversation = conversations.find(c => c.id === selectedConversationId);
      const tabTitle = (selectedConversation as any)?.contactName || 'Chat';

      // FIX: Evitar procesar la misma conversación múltiples veces
      if (processingRef.current === selectedConversationId) {
        return;
      }
      processingRef.current = selectedConversationId;

      const tabIdentity = `chat:${selectedConversationId}`;

      openTab('chats', {
        type: 'chat',
        identity: tabIdentity,
        title: tabTitle,
        context: { chatId: selectedConversationId },
        closable: true,
      });

      setActiveConversation(selectedConversationId);

      // Evitar loops de render: limpiamos la selección una vez manejada
      setSelectedConversation(null);

      // FIX: Limpiar ref después de un pequeño delay para permitir re-selección
      setTimeout(() => {
        processingRef.current = null;
      }, 100);
    }
  }, [selectedConversationId, activeActivity, openTab, containers, activateTab, focusContainer, setSelectedConversation, setActiveConversation, conversations]);

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
        flex-1 flex gap-1 p-1 bg-base overflow-hidden min-h-0
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
