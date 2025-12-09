/**
 * DynamicContainer - Panel dinámico con tabs
 * TOTEM PARTE 11: Dynamic Container
 */

import { useMemo } from 'react';
import { usePanelStore } from '../../store/panelStore';
import { TabBar } from './TabBar';
import { ChatView } from '../chat/ChatView';
import { WelcomeView } from '../chat/WelcomeView';
import { SettingsPanel } from '../settings/SettingsPanel';
import type { DynamicContainer as DynamicContainerType, Tab } from '../../types/panels';

interface DynamicContainerProps {
  container: DynamicContainerType;
  isActive: boolean;
}

export function DynamicContainer({ container, isActive }: DynamicContainerProps) {
  const { focusContainer } = usePanelStore();

  const activeTab = useMemo(() => {
    if (!container.activeTabId) return null;
    return container.tabs.find(t => t.id === container.activeTabId);
  }, [container.tabs, container.activeTabId]);

  const handleFocus = () => {
    if (!isActive) {
      focusContainer(container.id);
    }
  };

  // Si está minimizado, mostrar solo la barra
  if (container.minimized) {
    return (
      <div 
        className={`
          flex flex-col bg-surface border border-subtle rounded-t
          ${isActive ? 'ring-1 ring-[var(--accent-primary)]' : ''}
        `}
        onClick={handleFocus}
      >
        <TabBar container={container} />
      </div>
    );
  }

  return (
    <div 
      className={`
        flex flex-col h-full bg-surface border border-subtle rounded overflow-hidden
        ${isActive ? 'ring-1 ring-[var(--accent-primary)]' : ''}
      `}
      onClick={handleFocus}
    >
      {/* Tab Bar */}
      <TabBar container={container} />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <TabContent tab={activeTab} />
        ) : (
          <EmptyContainer type={container.type} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Tab Content Renderer
// ============================================================================

interface TabContentProps {
  tab: Tab;
}

function TabContent({ tab }: TabContentProps) {
  switch (tab.type) {
    case 'chat':
      return tab.context.chatId ? (
        <ChatView conversationId={tab.context.chatId} />
      ) : (
        <WelcomeView />
      );

    case 'contact':
      return (
        <div className="p-4">
          <h2 className="text-lg font-semibold text-primary">
            Contacto: {tab.context.contactName || 'Sin nombre'}
          </h2>
          <p className="text-secondary mt-2">
            ID: {tab.context.contactId}
          </p>
          {/* TODO: Implementar vista detallada de contacto */}
        </div>
      );

    case 'settings':
      return <SettingsPanel />;

    case 'extension':
      return (
        <div className="p-4">
          <h2 className="text-lg font-semibold text-primary">
            Extensión: {tab.context.extensionName || 'Desconocida'}
          </h2>
          {/* TODO: Cargar UI de extensión */}
        </div>
      );

    case 'editor':
      return (
        <div className="p-4">
          <h2 className="text-lg font-semibold text-primary">Editor</h2>
          <textarea 
            className="w-full h-64 mt-4 p-2 bg-elevated text-primary rounded border border-subtle focus:border-accent transition-colors"
            placeholder="Contenido del editor..."
            defaultValue={tab.context.content || ''}
          />
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full text-muted">
          Tipo de tab no reconocido: {tab.type}
        </div>
      );
  }
}

// ============================================================================
// Empty Container Placeholder
// ============================================================================

interface EmptyContainerProps {
  type: DynamicContainerType['type'];
}

function EmptyContainer({ type }: EmptyContainerProps) {
  const messages: Record<string, { title: string; subtitle: string }> = {
    chats: {
      title: 'Sin conversaciones',
      subtitle: 'Selecciona un chat de la barra lateral',
    },
    contacts: {
      title: 'Sin contactos',
      subtitle: 'Agrega contactos desde la barra lateral',
    },
    settings: {
      title: 'Configuración',
      subtitle: 'Selecciona una opción del menú',
    },
    extensions: {
      title: 'Extensiones',
      subtitle: 'Gestiona tus extensiones instaladas',
    },
    editor: {
      title: 'Editor',
      subtitle: 'Abre un archivo para editar',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Visualiza estadísticas y métricas',
    },
    custom: {
      title: 'Panel personalizado',
      subtitle: 'Contenido de extensión',
    },
  };

  const msg = messages[type] || messages.custom;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <p className="text-lg text-secondary">{msg.title}</p>
      <p className="text-sm text-muted mt-2">{msg.subtitle}</p>
    </div>
  );
}
