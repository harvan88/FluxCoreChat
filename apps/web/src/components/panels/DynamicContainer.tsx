/**
 * DynamicContainer - Panel dinámico con tabs
 * TOTEM PARTE 11: Dynamic Container
 */

import { useMemo, useCallback, Component, type ReactNode, type ComponentType } from 'react';
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
import { OpenAIAssistantEditor } from '../editors/OpenAIAssistantEditor';
import { WebsiteBuilderPanel } from '../extensions/WebsiteBuilderPanel';
import { ExtensionConfigPanel } from '../extensions/ExtensionConfigPanel';
import { FluxCorePromptInspectorPanel } from '../extensions/FluxCorePromptInspectorPanel';
import { UsageView } from '../fluxcore/views/UsageView';
import { AssistantsView } from '../fluxcore/views/AssistantsView';
import { InstructionsView } from '../fluxcore/views/InstructionsView';
import { VectorStoresView } from '../fluxcore/views/VectorStoresView';
import { ToolsView } from '../fluxcore/views/ToolsView';
import { OpenAIAssistantConfigView } from '../fluxcore/views/OpenAIAssistantConfigView';
import { CreditsSection } from '../settings/CreditsSection';
import { useExtensions } from '../../hooks/useExtensions';
import type { DynamicContainer as DynamicContainerType, Tab } from '../../types/panels';
import { MonitoringHub } from '../monitor/MonitoringHub';
import { AccountDataAuditPanel } from '../monitor/AccountDataAuditPanel';

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
          <TabContent tab={activeTab} containerId={container.id} />
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
  containerId: string;
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

// ============================================================================
// Extension Tab Content
// ============================================================================

interface ExtensionTabContentProps {
  tab: Tab;
  containerId: string;
}

function ExtensionTabContent({ tab, containerId }: ExtensionTabContentProps) {
  const { selectedAccountId } = useUIStore();
  const { openTab, closeTab } = usePanelStore();
  const { installations, updateConfig } = useExtensions(selectedAccountId || null);

  const extensionId = typeof tab.context.extensionId === 'string' ? tab.context.extensionId : '';
  const extensionName = typeof tab.context.extensionName === 'string' ? tab.context.extensionName : extensionId;

  const installation = useMemo(() => {
    if (!extensionId) return null;
    return installations.find((i) => i.extensionId === extensionId) || null;
  }, [installations, extensionId]);

  const openOrFocusFluxCoreTab = useCallback((
    viewId: string,
    title: string,
    icon: string,
    extraContext: Record<string, any>
  ) => {
    // 1. Construir identidad del recurso
    let identity = `extension:${extensionId}:${viewId}:${selectedAccountId}`;

    // Si es un recurso específico (assistant, vector-store, etc), agregar su ID a la identidad
    const resourceId = extraContext.assistantId || extraContext.vectorStoreId || extraContext.instructionId || extraContext.toolId;
    if (resourceId) {
      identity += `:${resourceId}`;
    }

    // 2. Abrir o enfocar usando la identidad centralizada
    openTab('extensions', {
      type: 'extension',
      identity,
      title,
      icon,
      closable: true,
      context: {
        extensionId,
        extensionName,
        view: viewId,
        accountId: selectedAccountId,
        ...extraContext,
      },
    });
  }, [extensionId, selectedAccountId, extensionName, openTab]);

  const onOpenFluxCoreItemTab = useCallback((tabId: string, title: string, data: any) => {
    if (!selectedAccountId) return;

    // ARQUITECTURA: Asistentes OpenAI usan vista EXCLUSIVA OpenAI
    if (data?.type === 'openai-assistant') {
      const id = data?.assistantId || data?.assistant?.id || tabId;
      openOrFocusFluxCoreTab('openai-assistant', title, 'Bot', { assistantId: id, runtime: 'openai' });
      return;
    }

    if (data?.type === 'assistant') {
      const id = data?.assistantId || data?.assistant?.id || tabId;
      openOrFocusFluxCoreTab('assistant', title, 'Bot', { assistantId: id });
      return;
    }

    if (data?.type === 'instruction') {
      const id = data?.instructionId || data?.instruction?.id || tabId;
      openOrFocusFluxCoreTab('instruction', title, 'FileText', { instructionId: id });
      return;
    }

    if (data?.type === 'openai-vector-store' || data?.type === 'vectorStore') {
      const id = data?.vectorStoreId || data?.store?.id || tabId;
      openOrFocusFluxCoreTab('vector-store', title, 'Database', { vectorStoreId: id });
      return;
    }
  }, [selectedAccountId, openOrFocusFluxCoreTab]);

  const panelComponent = installation?.manifest?.ui?.panel?.component;
  const isFluxCore = panelComponent === 'FluxCorePanel';

  if (!selectedAccountId) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        Selecciona una cuenta para configurar extensiones.
      </div>
    );
  }

  if (!extensionId) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        No se especificó una extensión.
      </div>
    );
  }

  if (!installation) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        La extensión no está instalada en esta cuenta.
      </div>
    );
  }

  const requestedView = typeof tab.context.view === 'string' ? tab.context.view : undefined;
  const view =
    isFluxCore && (requestedView === 'config' || requestedView === 'panel' || requestedView === 'fluxcore')
      ? 'assistants'
      : (requestedView || (isFluxCore ? 'assistants' : 'config'));


  // FluxCore Views - Vistas específicas de la plataforma de orquestación de IA
  if (isFluxCore) {
    const accountId = selectedAccountId || '';

    switch (view) {
      case 'usage':
        return <UsageView key={tab.id} accountId={accountId} />;
      case 'assistants':
        return (
          <AssistantsView
            key={tab.id}
            accountId={accountId}
            onOpenTab={onOpenFluxCoreItemTab}
            initialData={tab.context.initialData}
          />
        );
      case 'assistant':
        return (
          <AssistantsView
            key={tab.id}
            accountId={accountId}
            assistantId={tab.context.assistantId}
            onOpenTab={onOpenFluxCoreItemTab}
            initialData={tab.context.initialData}
          />
        );
      // ARQUITECTURA: Vista EXCLUSIVA para asistentes OpenAI
      case 'openai-assistant':
        return (
          <OpenAIAssistantConfigView
            key={tab.id}
            assistantId={tab.context.assistantId}
            accountId={accountId}
            onClose={() => closeTab(containerId, tab.id)}
            onSave={() => {
              // Refrescar lista si es necesario
            }}
            onDelete={() => {
              closeTab(containerId, tab.id);
            }}
          />
        );

      case 'instructions':
        return (
          <InstructionsView
            key={tab.id}
            accountId={accountId}
            onOpenTab={onOpenFluxCoreItemTab}
          />
        );
      case 'instruction':
        return (
          <InstructionsView
            key={tab.id}
            accountId={accountId}
            instructionId={tab.context.instructionId}
            onOpenTab={onOpenFluxCoreItemTab}
          />
        );
      case 'knowledge-base':
        return (
          <VectorStoresView
            key={tab.id}
            accountId={accountId}
            onOpenTab={onOpenFluxCoreItemTab}
            onClose={() => closeTab(containerId, tab.id)}
          />
        );
      case 'vector-store':
        return (
          <VectorStoresView
            key={tab.id}
            accountId={accountId}
            vectorStoreId={tab.context.vectorStoreId}
            onOpenTab={onOpenFluxCoreItemTab}
            onClose={() => closeTab(containerId, tab.id)}
          />
        );
      case 'tools':
        return <ToolsView key={tab.id} accountId={accountId} />;
      case 'debug':
        return <FluxCorePromptInspectorPanel accountId={accountId} />;
      case 'billing':
        return (
          <div className="h-full flex items-center justify-center text-muted">
            Facturación (próximamente)
          </div>
        );
      case 'promptInspector':
        return <FluxCorePromptInspectorPanel accountId={accountId} />;
    }
  }

  if (view === 'panel') {
    const panelComponentName = installation.manifest?.ui?.panel?.component;
    const panelComponents: Record<string, ComponentType> = {
      WebsiteBuilderPanel,
    };
    const PanelComponent = panelComponentName ? panelComponents[panelComponentName] : undefined;

    if (!PanelComponent) {
      return (
        <div className="h-full flex items-center justify-center text-muted">
          Panel de extensión no disponible.
        </div>
      );
    }

    return <PanelComponent />;
  }

  if (view === 'promptInspector') {
    if (isFluxCore) {
      return <FluxCorePromptInspectorPanel accountId={selectedAccountId || undefined} />;
    }

    return (
      <div className="h-full flex flex-col bg-surface">
        <div className="flex items-center justify-center text-muted">
          Prompt Inspector no disponible para esta extensión.
        </div>
      </div>
    );
  }

  return (
    <ExtensionConfigPanel
      extensionId={extensionId}
      extensionName={extensionName || installation.manifest?.name || extensionId}
      config={(installation.config || {}) as Record<string, unknown>}
      supportsPromptInspector={isFluxCore}
      onSave={async (config) => {
        await updateConfig(extensionId, config as Record<string, unknown>);
      }}
      onClose={() => closeTab(containerId, tab.id)}
    />
  );
}

function TabContent({ tab, containerId }: TabContentProps) {
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

    case 'settings': {
      const section = typeof tab.context?.section === 'string' ? tab.context.section : undefined;
      return <SettingsTabContent section={section} />;
    }

    case 'extension':
      return <ExtensionTabContent tab={tab} containerId={containerId} />;

    case 'editor': {
      const editorProps = tab.context || {};
      return (
        <ExpandedEditor
          title={editorProps.title}
          content={editorProps.content || ''}
          maxLength={editorProps.maxLength}
          placeholder={editorProps.placeholder}
          onSave={(content: string) => {
            if (typeof editorProps.onSave === 'function') {
              editorProps.onSave(content);
            }
          }}
          onClose={() => {
            if (typeof editorProps.onClose === 'function') {
              editorProps.onClose();
            }
          }}
          onChange={editorProps.onChange}
        />
      );
    }

    case 'openai-assistant-editor':
      return (
        <OpenAIAssistantEditor
          assistantId={tab.context.assistantId || ''}
          assistantName={tab.context.assistantName || 'Asistente'}
          externalId={tab.context.externalId || ''}
          accountId={tab.context.accountId || ''}
          content={tab.context.content || ''}
          maxLength={tab.context.maxLength || 256000}
          placeholder={tab.context.placeholder || 'Escribe las instrucciones del asistente...'}
          onSave={tab.context.onSave || (async () => { })}
          onChange={tab.context.onChange || (() => { })}
          onClose={tab.context.onClose || (() => { })}
        />
      );

    case 'monitoring': {
      const view = typeof tab.context?.view === 'string' ? tab.context.view : 'hub';
      if (view === 'audit') {
        return <AccountDataAuditPanel />;
      }
      return <MonitoringHub />;
    }

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

    case 'credits':
      return <CreditsSection onBack={handleBack} />;

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
