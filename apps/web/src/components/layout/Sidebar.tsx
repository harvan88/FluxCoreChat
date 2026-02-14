/**
 * Sidebar - Panel lateral con contenido según la actividad seleccionada
 * TOTEM: Especificación Canónica de Comportamiento de Interfaz
 * 
 * PRINCIPIO: ChatCore gobierna, extensiones inyectan.
 * 
 * Estados:
 * - Cerrado/Oculto: No visible
 * - Abierto/Expandido: Visible con contenido
 * - Fijado/Pinned: Permanece visible (candado activado)
 * 
 * Extensiones con UI:
 * - Actividades con prefijo 'ext:' renderizan el panel de la extensión
 * - Las extensiones se registran via ExtensionHost y sus vistas se obtienen del ViewRegistry
 */

import { useEffect, useState, type ComponentType } from 'react';
import { Lock, LockOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { usePanelStore } from '../../store/panelStore';
import { useExtensions } from '../../hooks/useExtensions';
import { FluxCoreView } from '@/types/fluxcore/views.types';

// Core imports (ChatCore views)
import { ConversationsList } from '../conversations/ConversationsList';
import { ContactsList } from '../contacts/ContactsList';
import { SettingsMenu } from '../settings/SettingsMenu';
import { ExtensionsPanel } from '../extensions';
import { MonitoringSidebar } from '../monitor/MonitoringSidebar';
import { ToolsSidebar } from '../tools/ToolsSidebar';

// Extension imports (legacy - will be migrated to ViewRegistry)
import { WebsiteBuilderPanel } from '../extensions/WebsiteBuilderPanel';
import { WebsiteBuilderSidebar } from '../extensions/WebsiteBuilderSidebar';
import { FluxCoreSidebar } from '../fluxcore/FluxCoreSidebar';

// ViewRegistry and ExtensionHost
import { viewRegistry } from '../../core/registry/ViewRegistry';
import { extensionHost } from '../../core/extension-api/ExtensionHost';
import type { ActivityType } from '../../types';

// Mapeo de componentes de extensión por nombre (fallback legacy para extensiones no migradas a tabs)
const extensionComponents: Record<string, ComponentType> = {
  WebsiteBuilderPanel: WebsiteBuilderPanel,
};

// ============================================================================
// Sidebar Title Resolution
// ============================================================================

/**
 * Resuelve el título del sidebar basándose en la actividad activa.
 * Usa el ViewRegistry para vistas del núcleo y ExtensionHost para extensiones.
 */
function resolveSidebarTitle(
  activeActivity: string,
  installations: Array<{ extensionId: string; manifest?: { name?: string; ui?: { panel?: { title?: string } } } }>
): string {
  // 1. Verificar si es una extensión
  if (activeActivity.startsWith('ext:')) {
    const extensionId = activeActivity.replace('ext:', '');

    // Intentar obtener del ExtensionHost primero
    const manifest = extensionHost.getManifest(extensionId);
    if (manifest?.sidebar?.title) {
      return manifest.sidebar.title;
    }

    // Fallback a installations (legacy)
    const installation = installations.find(i => i.extensionId === extensionId);
    return installation?.manifest?.ui?.panel?.title || installation?.manifest?.name || 'Extensión';
  }

  // 2. Intentar obtener del ViewRegistry
  const registryTitle = viewRegistry.getSidebarTitle(activeActivity as ActivityType);
  if (registryTitle) {
    return registryTitle;
  }

  // 3. Fallback a títulos hardcodeados (legacy)
  const fallbackTitles: Record<string, string> = {
    conversations: 'Conversaciones',
    contacts: 'Contactos',
    extensions: 'Extensiones',
    settings: 'Configuración',
    monitoring: 'Monitoreo',
  };

  return fallbackTitles[activeActivity] || '';
}

export function Sidebar() {
  const {
    activeActivity,
    sidebarOpen,
    sidebarPinned,
    selectedAccountId,
    toggleSidebarPinned,
    toggleSidebar,
    isMobile,
  } = useUIStore();

  const [fluxCoreActiveView, setFluxCoreActiveView] = useState<FluxCoreView>('usage');

  const { installations } = useExtensions(selectedAccountId);

  useEffect(() => {
    if (!activeActivity.startsWith('ext:')) return;

    const extensionId = activeActivity.replace('ext:', '');
    const installation = installations.find((i) => i.extensionId === extensionId);

    if (!installation) return;

    const panelComponent = installation.manifest?.ui?.panel?.component;
    if (panelComponent !== 'WebsiteBuilderPanel') return;

    const title = installation.manifest?.ui?.sidebar?.title || installation.manifest?.name || 'Extensión';

    const { layout, openTab, activateTab } = usePanelStore.getState();

    const existing = layout.containers
      .flatMap((c) => c.tabs.map((t) => ({ containerId: c.id, tab: t })))
      .find(
        ({ tab }) =>
          tab.type === 'extension' &&
          tab.context?.extensionId === extensionId &&
          tab.context?.view === 'panel'
      );

    if (existing) {
      const container = layout.containers.find((c) => c.id === existing.containerId);
      const isAlreadyActive = container?.activeTabId === existing.tab.id;
      const isAlreadyFocused = layout.focusedContainerId === existing.containerId;

      if (isAlreadyActive && isAlreadyFocused) return;
      activateTab(existing.containerId, existing.tab.id);
      return;
    }

    openTab('extensions', {
      type: 'extension',
      title,
      icon: '🌐',
      closable: true,
      context: {
        extensionId,
        extensionName: installation.manifest?.name || title,
        view: 'panel',
      },
    });
  }, [activeActivity, installations]);

  /**
   * Renderiza el contenido del sidebar basándose en la actividad activa.
   * 
   * Orden de resolución:
   * 1. Si es extensión (ext:*), buscar en ViewRegistry/ExtensionHost
   * 2. Si es actividad core, buscar en ViewRegistry
   * 3. Fallback a componentes hardcodeados (legacy)
   */
  const renderContent = () => {
    // ========================================
    // 1. Extensiones (prefijo 'ext:')
    // ========================================
    if (activeActivity.startsWith('ext:')) {
      const extensionId = activeActivity.replace('ext:', '');

      // Intentar obtener del ViewRegistry (nuevo sistema)
      const ExtensionSidebarView = viewRegistry.getExtensionView(extensionId, 'sidebar');
      if (ExtensionSidebarView) {
        return (
          <ExtensionSidebarView
            accountId={selectedAccountId || ''}
            extensionId={extensionId}
            context={{ accountName: extensionHost.getManifest(extensionId)?.displayName || 'Extensión' }}
            onOpenTab={(viewId, title, data) => {
              const { openTab } = usePanelStore.getState();
              const manifest = extensionHost.getManifest(extensionId);
              const viewConfig = manifest?.views[viewId];

              openTab('extensions', {
                type: 'extension',
                identity: `extension:${extensionId}:${viewId}:${selectedAccountId}`,
                title: title || viewConfig?.defaultTitle || viewId,
                icon: viewConfig?.defaultIcon || 'Settings',
                closable: true,
                context: {
                  extensionId,
                  extensionName: manifest?.displayName || extensionId,
                  view: viewId,
                  accountId: selectedAccountId,
                  ...data,
                },
              });
            }}
          />
        );
      }

      // Fallback: Sistema legacy para extensiones no migradas
      const installation = installations.find((i) => i.extensionId === extensionId);
      const panelComponent = installation?.manifest?.ui?.panel?.component;
      const extensionName = installation?.manifest?.name || installation?.manifest?.ui?.panel?.title || 'Extensión';

      if (panelComponent === 'FluxCorePanel') {
        return (
          <FluxCoreSidebar
            activeView={fluxCoreActiveView}
            onViewChange={(view) => {
              setFluxCoreActiveView(view);

              const { openTab } = usePanelStore.getState();
              const viewTitles: Record<string, string> = {
                usage: 'Uso',
                assistants: 'Asistentes',
                instructions: 'Instrucciones del sistema',
                'knowledge-base': 'Base de conocimiento',
                tools: 'Herramientas',
                agents: 'Agentes',
                debug: 'Depuración',
                billing: 'Facturación',
              };

              const viewIcons: Record<string, string> = {
                usage: 'BarChart3',
                assistants: 'Bot',
                instructions: 'FileText',
                'knowledge-base': 'Database',
                tools: 'Wrench',
                agents: 'GitBranch',
                debug: 'Bug',
                billing: 'CreditCard',
              };

              const tabIdentity = `extension:${extensionId}:${view}:${selectedAccountId}`;

              openTab('extensions', {
                type: 'extension',
                identity: tabIdentity,
                title: viewTitles[view] || view,
                icon: viewIcons[view] || 'Settings',
                closable: true,
                context: {
                  extensionId,
                  extensionName,
                  view: view,
                  accountId: selectedAccountId,
                },
              });
            }}
            accountName={extensionName}
            accountId={selectedAccountId}
          />
        );
      }

      if (panelComponent === 'WebsiteBuilderPanel') {
        return <WebsiteBuilderSidebar />;
      }

      if (panelComponent) {
        const ExtensionComponent = extensionComponents[panelComponent];
        if (ExtensionComponent) {
          return <ExtensionComponent />;
        }
      }

      return (
        <div className="p-4 text-center text-secondary">
          <p>Panel de extensión no disponible</p>
        </div>
      );
    }

    // ========================================
    // 2. Actividades del núcleo (ChatCore)
    // ========================================

    // Intentar obtener del ViewRegistry (nuevo sistema)
    const CoreSidebarView = viewRegistry.getSidebarView(activeActivity as ActivityType);
    if (CoreSidebarView) {
      return <CoreSidebarView accountId={selectedAccountId} />;
    }

    // Fallback: Componentes hardcodeados (legacy)
    switch (activeActivity) {
      case 'conversations':
        return <ConversationsList />;
      case 'contacts':
        return <ContactsList />;
      case 'tools':
        return <ToolsSidebar accountId={selectedAccountId} />;
      case 'monitoring':
        return <MonitoringSidebar />;
      case 'extensions':
        return <ExtensionsPanel accountId={selectedAccountId || ''} variant="sidebar" />;
      case 'settings':
        return <SettingsMenu />;
      default:
        return null;
    }
  };

  /**
   * Obtiene el título del sidebar usando la función de resolución centralizada.
   */
  const getTitle = () => {
    return resolveSidebarTitle(activeActivity, installations);
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
          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            className={clsx(
              'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
              'text-secondary hover:text-primary hover:bg-hover'
            )}
            title={sidebarOpen ? 'Colapsar sidebar' : 'Expandir sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
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
