/**
 * WebsiteBuilderPanel Component
 * Extension Karen - Website Builder
 * Panel de administración para crear y editar sitios web
 */

import { useEffect, useMemo } from 'react';
import { 
  Globe, 
  Eye, 
  Settings,
  ExternalLink,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { useAccountStore } from '../../store/accountStore';
import { useUIStore } from '../../store/uiStore';
import { useWebsiteBuilderStore } from '../../store/websiteBuilderStore';

export function WebsiteBuilderPanel() {
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
  const editContent = useWebsiteBuilderStore((s) => s.editContent);
  const isEditing = useWebsiteBuilderStore((s) => s.isEditing);
  const isSaving = useWebsiteBuilderStore((s) => s.isSaving);

  const loadWebsite = useWebsiteBuilderStore((s) => s.loadWebsite);
  const setEditContent = useWebsiteBuilderStore((s) => s.setEditContent);
  const setIsEditing = useWebsiteBuilderStore((s) => s.setIsEditing);
  const saveSelectedPage = useWebsiteBuilderStore((s) => s.saveSelectedPage);

  const selectedPage = useMemo(() => {
    if (!websiteConfig || !selectedPagePath) return null;
    return websiteConfig.pages.find((p) => p.path === selectedPagePath) || null;
  }, [websiteConfig, selectedPagePath]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        <p>Selecciona una cuenta para gestionar su sitio web</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-base">
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="m-4 p-4 bg-elevated border border-subtle rounded text-error">
            {error}
          </div>
        )}
        
        {!websiteConfig ? (
          <div className="flex-1 flex items-center justify-center text-muted">
            <div className="text-center">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay sitio web creado todavía.</p>
              <p className="text-xs text-muted mt-2">Usa el sidebar para crearlo.</p>
            </div>
          </div>
        ) : selectedPage ? (
          <>
            {/* Page header */}
            <div className="flex items-center justify-between p-4 border-b border-subtle">
              <div>
                <h3 className="text-lg font-semibold text-primary">{selectedPage.title}</h3>
                <p className="text-sm text-muted">{selectedPage.path}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-2 hover:bg-hover rounded"
                      title="Cancelar"
                    >
                      <X className="w-5 h-5 text-muted" />
                    </button>
                    <button
                      onClick={() => {
                        if (!currentAccount?.id) return;
                        void saveSelectedPage(currentAccount.id);
                      }}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:opacity-90 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Guardar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-surface border border-subtle rounded hover:bg-hover"
                    >
                      <Settings className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (!websiteConfig?.publicUrl) return;
                        const pageUrl =
                          selectedPage.path === '/'
                            ? websiteConfig.publicUrl
                            : `${websiteConfig.publicUrl}${selectedPage.path}`;
                        window.open(pageUrl, '_blank');
                      }}
                      className="p-2 hover:bg-hover rounded"
                      title="Vista previa"
                    >
                      <Eye className="w-5 h-5 text-muted" />
                    </button>
                    {websiteConfig.publicUrl && (
                      <a
                        href={websiteConfig.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-hover rounded"
                        title="Ver sitio"
                      >
                        <ExternalLink className="w-5 h-5 text-muted" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full p-4 bg-base text-primary font-mono text-sm resize-none focus:outline-none"
                  placeholder="Escribe el contenido en Markdown..."
                />
              ) : (
                <div className="h-full overflow-y-auto p-4">
                  <pre className="text-sm text-secondary whitespace-pre-wrap font-mono">
                    {selectedPage.content}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 opacity-50 flex items-center justify-center">
                <Globe className="w-10 h-10" />
              </div>
              <p>Selecciona una página para editar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WebsiteBuilderPanel;
