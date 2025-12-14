/**
 * WebsiteBuilderPanel Component
 * Extension Karen - Website Builder
 * Panel de administración para crear y editar sitios web
 */

import { useState, useEffect } from 'react';
import { 
  Globe, 
  FileText, 
  Plus, 
  Eye, 
  Upload, 
  Settings,
  ExternalLink,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { useAccountStore } from '../../store/accountStore';
import { useUIStore } from '../../store/uiStore';

interface WebsitePage {
  path: string;
  title: string;
  description?: string;
  content: string;
  frontmatter: Record<string, unknown>;
  updatedAt: string;
}

interface WebsiteConfig {
  id: string;
  accountId: string;
  status: 'draft' | 'published' | 'archived';
  config: {
    name: string;
    language: string;
    theme: string;
    menus?: {
      main?: Array<{ title: string; path: string }>;
    };
    company?: {
      phone?: string;
      address?: string;
    };
  };
  pages: WebsitePage[];
  publicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function WebsiteBuilderPanel() {
  // VER-005: Usar uiStore como fuente primaria (se carga al login)
  const { selectedAccountId, accounts: uiAccounts } = useUIStore();
  const { activeAccount, accounts: accountStoreAccounts, loadAccounts } = useAccountStore();
  
  // Combinar fuentes: preferir uiStore (cargado al login), fallback a accountStore
  const accounts = uiAccounts.length > 0 ? uiAccounts : accountStoreAccounts;
  const currentAccount = accounts.find(a => a.id === selectedAccountId) || activeAccount || null;
  
  // Cargar cuentas si no hay ninguna en ningún store
  useEffect(() => {
    if (accounts.length === 0) {
      console.log('[WebsiteBuilderPanel] No accounts in any store, calling loadAccounts');
      loadAccounts();
    }
  }, [accounts.length, loadAccounts]);
  
  // Recargar datos de website cuando cambia la cuenta
  useEffect(() => {
    if (selectedAccountId) {
      console.log('[WebsiteBuilderPanel] Account changed, reloading website data for:', selectedAccountId);
      setLoading(true);
      setError(null);
      // Aquí se recargarían los datos del website para la nueva cuenta
      loadWebsiteData(selectedAccountId);
    }
  }, [selectedAccountId]);
  
  console.log('[WebsiteBuilderPanel] uiAccounts:', uiAccounts.length, 'accountStoreAccounts:', accountStoreAccounts.length);
  console.log('[WebsiteBuilderPanel] selectedAccountId:', selectedAccountId);
  console.log('[WebsiteBuilderPanel] currentAccount:', currentAccount?.id, currentAccount?.displayName);
  
  const [websiteConfig, setWebsiteConfig] = useState<WebsiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<WebsitePage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Función para cargar datos del website
  const loadWebsiteData = async (accountId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/websites/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setWebsiteConfig(data.data);
        } else {
          setWebsiteConfig(null);
        }
      } else {
        throw new Error('Error loading website data');
      }
    } catch (err) {
      console.error('[WebsiteBuilderPanel] Error loading website data:', err);
      setError('Error al cargar datos del sitio web');
      setWebsiteConfig(null);
    } finally {
      setLoading(false);
    }
  };
  const [isBuilding, setIsBuilding] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Load website config
  useEffect(() => {
    if (!currentAccount?.id) {
      console.log('[WebsiteBuilderPanel] No account selected, skipping load');
      setLoading(false);
      return;
    }
    
    console.log('[WebsiteBuilderPanel] Loading config for account:', currentAccount.id);
    loadWebsiteConfig();
  }, [currentAccount?.id]);

  const loadWebsiteConfig = async () => {
    if (!currentAccount?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('fluxcore_token');
      
      if (!token) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }
      
      console.log('[WebsiteBuilderPanel] Fetching:', `${API_URL}/websites/${currentAccount.id}`);
      
      const response = await fetch(`${API_URL}/websites/${currentAccount.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('[WebsiteBuilderPanel] Response status:', response.status);
      
      if (response.status === 404) {
        console.log('[WebsiteBuilderPanel] No website found, showing create option');
        setWebsiteConfig(null);
        setLoading(false);
        return;
      }
      
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[WebsiteBuilderPanel] Loaded config:', data);
      setWebsiteConfig(data.data);
    } catch (err: any) {
      console.error('[WebsiteBuilderPanel] Error:', err);
      setError(err.message || 'Error al cargar la configuración del sitio web');
    } finally {
      setLoading(false);
    }
  };

  const createWebsite = async () => {
    if (!currentAccount?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('fluxcore_token');
      const response = await fetch(`${API_URL}/websites/${currentAccount.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create website');
      }
      
      const data = await response.json();
      setWebsiteConfig(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savePage = async () => {
    if (!currentAccount?.id || !selectedPage) return;
    
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('fluxcore_token');
      const pagePath = selectedPage.path === '/' ? '' : selectedPage.path;
      
      const response = await fetch(`${API_URL}/websites/${currentAccount.id}/pages${pagePath}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save page');
      }
      
      await loadWebsiteConfig();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const buildWebsite = async () => {
    if (!currentAccount?.id) return;
    
    setIsBuilding(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('fluxcore_token');
      const response = await fetch(`${API_URL}/websites/${currentAccount.id}/build`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to build website');
      }
      
      await loadWebsiteConfig();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBuilding(false);
    }
  };

  const publishWebsite = async () => {
    if (!currentAccount?.id) return;
    
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('fluxcore_token');
      
      // Build first
      await fetch(`${API_URL}/websites/${currentAccount.id}/build`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Then publish
      const response = await fetch(`${API_URL}/websites/${currentAccount.id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to publish website');
      }
      
      await loadWebsiteConfig();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addPage = async () => {
    if (!currentAccount?.id) return;
    
    const pagePath = prompt('Ruta de la página (ej: /servicios, /contacto):');
    if (!pagePath) return;
    
    const pageTitle = prompt('Título de la página:');
    if (!pageTitle) return;
    
    try {
      const token = localStorage.getItem('fluxcore_token');
      const response = await fetch(`${API_URL}/websites/${currentAccount.id}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: pagePath.startsWith('/') ? pagePath : `/${pagePath}`,
          title: pageTitle,
          content: `# ${pageTitle}\n\nContenido de la página...`,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add page');
      }
      
      await loadWebsiteConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

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

  // No website config yet
  if (!websiteConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Globe className="w-16 h-16 text-muted" />
        <h2 className="text-xl font-semibold text-primary">Crea tu sitio web</h2>
        <p className="text-secondary text-center max-w-md">
          Genera un sitio web estático para tu negocio con integración de chat
          para que tus clientes puedan contactarte directamente.
        </p>
        <button
          onClick={createWebsite}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Crear sitio web
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-base">
      {/* Sidebar - Pages list */}
      <div className="w-64 border-r border-subtle bg-surface flex flex-col">
        <div className="p-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Sitio Web
          </h2>
          <p className="text-sm text-muted mt-1">
            Estado: <span className={
              websiteConfig.status === 'published' ? 'text-green-500' :
              websiteConfig.status === 'draft' ? 'text-yellow-500' : 'text-secondary'
            }>
              {websiteConfig.status === 'published' ? 'Publicado' :
               websiteConfig.status === 'draft' ? 'Borrador' : 'Archivado'}
            </span>
          </p>
        </div>
        
        {/* Pages */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted uppercase">Páginas</span>
              <button
                onClick={addPage}
                className="p-1 hover:bg-hover rounded"
                title="Añadir página"
              >
                <Plus className="w-4 h-4 text-muted" />
              </button>
            </div>
            
            {websiteConfig.pages.map((page) => (
              <button
                key={page.path}
                onClick={() => {
                  setSelectedPage(page);
                  setEditContent(page.content);
                  setIsEditing(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
                  selectedPage?.path === page.path
                    ? 'bg-accent/20 text-accent'
                    : 'hover:bg-hover text-secondary'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="truncate">{page.title}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-subtle space-y-2">
          <button
            onClick={buildWebsite}
            disabled={isBuilding}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-subtle rounded hover:bg-hover transition-colors disabled:opacity-50"
          >
            {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Generar sitio
          </button>
          
          <button
            onClick={publishWebsite}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {websiteConfig.status === 'published' ? 'Actualizar' : 'Publicar'}
          </button>
          
          {websiteConfig.publicUrl && (
            <a
              href={websiteConfig.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-accent hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Ver sitio
            </a>
          )}
        </div>
      </div>
      
      {/* Main content - Editor */}
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="m-4 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
            {error}
          </div>
        )}
        
        {selectedPage ? (
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
                      onClick={savePage}
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
                      onClick={() => window.open(`/${currentAccount.username || currentAccount.id}${selectedPage.path}`, '_blank')}
                      className="p-2 hover:bg-hover rounded"
                      title="Vista previa"
                    >
                      <Eye className="w-5 h-5 text-muted" />
                    </button>
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
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Selecciona una página para editar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WebsiteBuilderPanel;
