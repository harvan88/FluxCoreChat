import { useEffect, useMemo } from 'react';
import { FileText, Globe, Loader2, Plus, ExternalLink, Upload } from 'lucide-react';
import { useAccountStore } from '../../store/accountStore';
import { useUIStore } from '../../store/uiStore';
import { useWebsiteBuilderStore } from '../../store/websiteBuilderStore';

export function WebsiteBuilderSidebar() {
  const { selectedAccountId, accounts: uiAccounts } = useUIStore();
  const { activeAccount, accounts: accountStoreAccounts, loadAccounts } = useAccountStore();

  const accounts = uiAccounts.length > 0 ? uiAccounts : accountStoreAccounts;

  const currentAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || activeAccount || null;
  }, [accounts, selectedAccountId, activeAccount]);

  const websiteConfig = useWebsiteBuilderStore((s) => s.websiteConfig);
  const loading = useWebsiteBuilderStore((s) => s.loading);
  const error = useWebsiteBuilderStore((s) => s.error);
  const loadedAccountId = useWebsiteBuilderStore((s) => s.loadedAccountId);
  const selectedPagePath = useWebsiteBuilderStore((s) => s.selectedPagePath);

  const loadWebsite = useWebsiteBuilderStore((s) => s.loadWebsite);
  const createWebsite = useWebsiteBuilderStore((s) => s.createWebsite);
  const selectPage = useWebsiteBuilderStore((s) => s.selectPage);
  const addPage = useWebsiteBuilderStore((s) => s.addPage);
  const buildWebsite = useWebsiteBuilderStore((s) => s.buildWebsite);
  const publishWebsite = useWebsiteBuilderStore((s) => s.publishWebsite);

  const isSaving = useWebsiteBuilderStore((s) => s.isSaving);
  const isBuilding = useWebsiteBuilderStore((s) => s.isBuilding);

  useEffect(() => {
    if (accounts.length === 0) {
      loadAccounts();
    }
  }, [accounts.length, loadAccounts]);

  useEffect(() => {
    if (!currentAccount?.id) return;
    if (loadedAccountId === currentAccount.id) return;
    if (loading) return;

    void loadWebsite(currentAccount.id);
  }, [currentAccount?.id, loadedAccountId, loading, loadWebsite]);

  const handleAddPage = async () => {
    if (!currentAccount?.id) return;

    const pagePath = prompt('Ruta de la página (ej: /servicios, /contacto):');
    if (!pagePath) return;

    const pageTitle = prompt('Título de la página:');
    if (!pageTitle) return;

    const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;

    await addPage(currentAccount.id, normalizedPath, pageTitle);

    const cfg = useWebsiteBuilderStore.getState().websiteConfig;
    const page = cfg?.pages.find((p) => p.path === normalizedPath);
    if (page) {
      selectPage(page);
    }
  };

  if (!currentAccount) {
    return (
      <div className="p-4 text-muted">
        Selecciona una cuenta para gestionar su sitio web.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="m-3 p-3 bg-elevated border border-subtle rounded text-error text-sm">
          {error}
        </div>
      )}

      <div className="px-4 py-3 border-b border-subtle">
        <div className="flex items-center gap-2 text-primary font-medium">
          <Globe size={16} className="text-accent" />
          <span className="truncate">Sitio Web</span>
        </div>

        <div className="mt-1 text-xs text-muted">
          Estado:{' '}
          <span className="text-secondary">
            {websiteConfig?.status === 'published'
              ? 'Publicado'
              : websiteConfig?.status === 'draft'
                ? 'Borrador'
                : websiteConfig?.status === 'archived'
                  ? 'Archivado'
                  : '—'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-xs text-muted uppercase">Páginas</span>
            <button
              onClick={handleAddPage}
              className="p-1 rounded hover:bg-hover text-secondary hover:text-primary"
              title="Añadir página"
              disabled={!websiteConfig}
            >
              <Plus size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : websiteConfig?.pages?.length ? (
            <div className="space-y-1">
              {websiteConfig.pages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => selectPage(page)}
                  className={
                    'w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors ' +
                    (selectedPagePath === page.path
                      ? 'bg-active text-primary'
                      : 'text-secondary hover:text-primary hover:bg-hover')
                  }
                >
                  <FileText size={16} className="flex-shrink-0" />
                  <span className="truncate text-sm">{page.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4 text-sm text-muted">
              {websiteConfig ? 'No hay páginas.' : 'Crea un sitio web para comenzar.'}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-subtle space-y-2">
        {!websiteConfig ? (
          <button
            onClick={() => createWebsite(currentAccount.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-inverse rounded hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Crear sitio web
          </button>
        ) : (
          <>
            <button
              onClick={() => buildWebsite(currentAccount.id)}
              disabled={isBuilding}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-subtle rounded hover:bg-hover transition-colors disabled:opacity-50"
            >
              {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={16} />}
              Generar sitio
            </button>

            <button
              onClick={() => publishWebsite(currentAccount.id)}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-inverse rounded hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe size={16} />}
              {websiteConfig.status === 'published' ? 'Actualizar' : 'Publicar'}
            </button>

            {websiteConfig.publicUrl && (
              <a
                href={websiteConfig.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-accent hover:underline"
              >
                <ExternalLink size={16} />
                Ver sitio
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default WebsiteBuilderSidebar;
