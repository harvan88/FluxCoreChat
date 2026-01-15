/**
 * COR-040: ExtensionsPanel Component
 * 
 * Panel para gestionar extensiones instaladas y disponibles.
 */

import { useState } from 'react';
import { Search, RefreshCw, Package, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { ExtensionCard } from './ExtensionCard';
import { useExtensions } from '../../hooks/useExtensions';
import { usePanelStore } from '../../store/panelStore';
import { useUIStore } from '../../store/uiStore';

type TabType = 'all' | 'installed' | 'available';

interface ExtensionsPanelProps {
  accountId: string;
}

export function ExtensionsPanel({ 
  accountId
}: ExtensionsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { openTab } = usePanelStore();
  const { setActiveActivity } = useUIStore();

  const {
    extensions,
    isLoading,
    error,
    install,
    uninstall,
    toggle,
    refresh,
  } = useExtensions(accountId);

  const handleOpenConfigure = (extensionId: string, extensionName: string, view?: string) => {
    openTab('extensions', {
      type: 'extension',
      title: extensionName,
      icon: 'Settings',
      closable: true,
      context: {
        extensionId,
        extensionName,
        ...(view ? { view } : {}),
      },
    });
  };

  const handleActivateExtension = (extensionId: string) => {
    setActiveActivity(`ext:${extensionId}` as any);
  };

  if (!accountId) {
    return (
      <div className="h-full flex flex-col bg-surface">
        <div className="p-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <Package className="text-accent" size={24} />
            <h2 className="text-lg font-semibold text-primary">Extensiones</h2>
          </div>
        </div>
        <div className="flex-1 p-6 text-secondary">
          Selecciona una cuenta para ver y configurar extensiones.
        </div>
      </div>
    );
  }

  // Filtrar extensiones
  const filteredExtensions = extensions.filter(ext => {
    // Filtro por tab
    if (activeTab === 'installed' && ext.status === 'available') return false;
    if (activeTab === 'available' && ext.status !== 'available') return false;

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ext.name.toLowerCase().includes(query) ||
        ext.description.toLowerCase().includes(query) ||
        ext.author.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Contar extensiones
  const counts = {
    all: extensions.length,
    installed: extensions.filter(e => e.status !== 'available').length,
    available: extensions.filter(e => e.status === 'available').length,
  };

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="text-accent" size={24} />
            <h2 className="text-lg font-semibold text-primary">Extensiones</h2>
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isLoading 
                ? 'text-muted cursor-not-allowed' 
                : 'text-secondary hover:text-primary hover:bg-hover'
            )}
            title="Actualizar"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar extensiones..."
            className="w-full bg-elevated text-primary pl-10 pr-4 py-2 rounded-lg border border-subtle focus:border-accent focus:outline-none text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(['all', 'installed', 'available'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                activeTab === tab
                  ? 'bg-accent text-inverse'
                  : 'text-secondary hover:text-primary hover:bg-hover'
              )}
            >
              {tab === 'all' && 'Todas'}
              {tab === 'installed' && 'Instaladas'}
              {tab === 'available' && 'Disponibles'}
              <span className="ml-1.5 text-xs opacity-70">({counts[tab]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Extensions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredExtensions.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="mx-auto text-muted mb-3" size={48} />
            <p className="text-secondary">
              {searchQuery 
                ? 'No se encontraron extensiones'
                : activeTab === 'installed' 
                  ? 'No tienes extensiones instaladas'
                  : 'No hay extensiones disponibles'}
            </p>
          </div>
        ) : (
          filteredExtensions.map((extension) => (
            <ExtensionCard
              key={extension.id}
              extension={extension}
              onInstall={() => install(extension.id)}
              onUninstall={() => uninstall(extension.id)}
              onToggle={(enabled) => toggle(extension.id, enabled)}
              onConfigure={
                extension.status !== 'available'
                  ? () => {
                      const panelComponent = extension.installation?.manifest?.ui?.panel?.component;
                      const isFluxCore = panelComponent === 'FluxCorePanel';
                      const hasSidebarUI = Boolean(extension.installation?.manifest?.ui?.sidebar);

                      if (isFluxCore) {
                        handleActivateExtension(extension.id);
                        return;
                      }

                      if (hasSidebarUI) {
                        handleActivateExtension(extension.id);
                        return;
                      }

                      handleOpenConfigure(extension.id, extension.name);
                    }
                  : undefined
              }
              isLoading={isLoading}
            />
          ))
        )}
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-subtle text-xs text-muted">
        <div className="flex items-center justify-between">
          <span>{counts.installed} extensiones activas</span>
          <a 
            href="#" 
            className="text-accent hover:text-accent/80 transition-colors"
          >
            Explorar marketplace
          </a>
        </div>
      </div>
    </div>
  );
}
