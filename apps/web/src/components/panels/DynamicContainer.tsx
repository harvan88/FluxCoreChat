/**
 * DynamicContainer - Panel dinámico con tabs
 * TOTEM PARTE 11: Dynamic Container
 */

import { useMemo, Component, type ReactNode } from 'react';
import { usePanelStore } from '../../store/panelStore';
import { useUIStore } from '../../store/uiStore';
import { TabBar } from './TabBar';
import { ChatView } from '../chat/ChatView';
import { WelcomeView } from '../chat/WelcomeView';
import { ContactDetails } from '../contacts/ContactDetails';
import { ProfileSection } from '../settings/ProfileSection';
import { AccountsSection } from '../accounts';
import { ThemeSettings } from '../common';
import { ExpandedEditor } from '../editors/ExpandedEditor';
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

      {/* Content Area - sin scroll propio, el hijo maneja su scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
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

class ChatViewErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMessage: string | null }
> {
  state = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Error desconocido',
    };
  }

  reset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-elevated border border-subtle rounded-lg p-4">
            <div className="text-primary font-medium">Error en el chat</div>
            <div className="text-sm text-muted mt-1 break-words">{this.state.errorMessage}</div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={this.reset}
                className="px-3 py-2 rounded-md bg-hover text-primary hover:bg-active transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function TabContent({ tab }: TabContentProps) {
  const { selectedAccountId } = useUIStore();
  
  switch (tab.type) {
    case 'chat':
      return tab.context.chatId ? (
        <ChatViewErrorBoundary>
          <ChatView 
            conversationId={tab.context.chatId} 
            accountId={selectedAccountId || undefined}
          />
        </ChatViewErrorBoundary>
      ) : (
        <WelcomeView />
      );

    case 'contact':
      return tab.context.contactId ? (
        <ContactDetails contactId={tab.context.contactId} />
      ) : (
        <div className="flex items-center justify-center h-full text-muted">
          No se especificó un contacto
        </div>
      );

    case 'settings':
      return <SettingsTabContent section={tab.context.settingsSection} />;

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
        <ExpandedEditor
          title={tab.context.title || 'Editor'}
          content={tab.context.content || ''}
          maxLength={tab.context.maxLength || 5000}
          placeholder={tab.context.placeholder || 'Escribe aquí...'}
          onSave={tab.context.onSave || (() => {})}
          onClose={tab.context.onClose || (() => {})}
        />
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

// ============================================================================
// Settings Tab Content - Renderiza la sección de settings apropiada
// ============================================================================

interface SettingsTabContentProps {
  section?: string;
}

function SettingsTabContent({ section }: SettingsTabContentProps) {
  // Wrapper para secciones que necesitan onBack (lo ignoramos en este contexto)
  const handleBack = () => {
    // En el contexto de tabs, no hay "back" - el usuario cierra el tab
  };

  switch (section) {
    case 'profile':
      return <ProfileSection onBack={handleBack} />;

    case 'accounts':
      return <AccountsSection onBack={handleBack} />;

    case 'appearance':
      return (
        <div className="h-full overflow-y-auto p-6">
          <h2 className="text-xl font-semibold text-primary mb-6">Apariencia</h2>
          <ThemeSettings />
        </div>
      );

    case 'notifications':
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-secondary">Notificaciones</p>
            <p className="text-sm text-muted mt-2">Próximamente</p>
          </div>
        </div>
      );

    case 'privacy':
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-secondary">Privacidad</p>
            <p className="text-sm text-muted mt-2">Próximamente</p>
          </div>
        </div>
      );

    default:
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-secondary">Configuración</p>
            <p className="text-sm text-muted mt-2">Selecciona una opción del menú</p>
          </div>
        </div>
      );
  }
}
