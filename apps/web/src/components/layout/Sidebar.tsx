/**
 * Sidebar - Panel lateral con contenido según la actividad seleccionada
 * TOTEM: Especificación Canónica de Comportamiento de Interfaz
 * 
 * Estados:
 * - Cerrado/Oculto: No visible
 * - Abierto/Expandido: Visible con contenido
 * - Fijado/Pinned: Permanece visible (candado activado)
 * 
 * Extensiones con UI:
 * - Actividades con prefijo 'ext:' renderizan el panel de la extensión
 */

import { useEffect, useState, type ComponentType } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { usePanelStore } from '../../store/panelStore';
import { ConversationsList } from '../conversations/ConversationsList';
import { ContactsList } from '../contacts/ContactsList';
import { SettingsMenu } from '../settings/SettingsMenu';
import { ExtensionsPanel } from '../extensions';
import { WebsiteBuilderPanel } from '../extensions/WebsiteBuilderPanel';
import { WebsiteBuilderSidebar } from '../extensions/WebsiteBuilderSidebar';
import { FluxCoreSidebar } from '../fluxcore/FluxCoreSidebar';
import { useExtensions } from '../../hooks/useExtensions';

// Mapeo de componentes de extensión por nombre (fallback legacy para extensiones no migradas a tabs)
const extensionComponents: Record<string, ComponentType> = {
  WebsiteBuilderPanel: WebsiteBuilderPanel,
};

export function Sidebar() {
  const { 
    activeActivity, 
    sidebarOpen, 
    sidebarPinned,
    selectedAccountId,
    toggleSidebarPinned,
    isMobile,
  } = useUIStore();

  const [fluxCoreActiveView, setFluxCoreActiveView] = useState<'usage' | 'assistants' | 'instructions' | 'knowledge-base' | 'tools' | 'debug' | 'billing'>('usage');
  
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

  const renderContent = () => {
    // Verificar si es una actividad de extensión
    if (activeActivity.startsWith('ext:')) {
      const extensionId = activeActivity.replace('ext:', '');
      const installation = installations.find((i) => i.extensionId === extensionId);

      const panelComponent = installation?.manifest?.ui?.panel?.component;
      const extensionName = installation?.manifest?.name || installation?.manifest?.ui?.panel?.title || 'Extensión';

      if (panelComponent === 'FluxCorePanel') {
        return (
          <FluxCoreSidebar
            activeView={fluxCoreActiveView}
            onViewChange={(view) => {
              setFluxCoreActiveView(view);

              const { layout, openTab, activateTab, closeTab, focusContainer } = usePanelStore.getState();
              const viewTitles: Record<string, string> = {
                usage: 'Uso',
                assistants: 'Asistentes',
                instructions: 'Instrucciones del sistema',
                'knowledge-base': 'Base de conocimiento',
                tools: 'Herramientas',
                debug: 'Depuración',
                billing: 'Facturación',
              };

              const viewIcons: Record<string, string> = {
                usage: 'BarChart3',
                assistants: 'Bot',
                instructions: 'FileText',
                'knowledge-base': 'Database',
                tools: 'Wrench',
                debug: 'Bug',
                billing: 'CreditCard',
              };

              const existing = layout.containers
                .flatMap((c) => c.tabs.map((t) => ({ containerId: c.id, tab: t, container: c })))
                .find(
                  ({ tab }) =>
                    tab.type === 'extension' &&
                    tab.context?.extensionId === extensionId &&
                    tab.context?.view === view &&
                    tab.context?.accountId === selectedAccountId
                );

              if (existing) {
                const isAlreadyActive = existing.container.activeTabId === existing.tab.id;
                const isAlreadyFocused = layout.focusedContainerId === existing.containerId;

                if (isAlreadyActive && isAlreadyFocused) {
                  closeTab(existing.containerId, existing.tab.id);
                  return;
                }

                activateTab(existing.containerId, existing.tab.id);
                focusContainer(existing.containerId);
                return;
              }

              openTab('extensions', {
                type: 'extension',
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

    switch (activeActivity) {
      case 'conversations':
        return <ConversationsList />;
      case 'contacts':
        return <ContactsList />;
      case 'extensions':
        return <ExtensionsPanel accountId={selectedAccountId || ''} />;
      case 'settings':
        return <SettingsMenu />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    // Título para extensiones dinámicas
    if (activeActivity.startsWith('ext:')) {
      const extensionId = activeActivity.replace('ext:', '');
      const installation = installations.find(i => i.extensionId === extensionId);
      return installation?.manifest?.ui?.panel?.title || installation?.manifest?.name || 'Extensión';
    }

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
