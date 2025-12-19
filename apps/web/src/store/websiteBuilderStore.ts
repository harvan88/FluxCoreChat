import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

interface WebsiteBuilderState {
  websiteConfig: WebsiteConfig | null;
  loading: boolean;
  error: string | null;

  loadedAccountId: string | null;

  selectedPagePath: string | null;
  editContent: string;
  isEditing: boolean;

  isSaving: boolean;
  isBuilding: boolean;

  loadWebsite: (accountId: string) => Promise<void>;
  createWebsite: (accountId: string) => Promise<void>;

  selectPage: (page: WebsitePage) => void;
  setEditContent: (content: string) => void;
  setIsEditing: (isEditing: boolean) => void;

  saveSelectedPage: (accountId: string) => Promise<void>;
  addPage: (accountId: string, path: string, title: string) => Promise<void>;

  buildWebsite: (accountId: string) => Promise<void>;
  publishWebsite: (accountId: string) => Promise<void>;
}

function getToken() {
  return localStorage.getItem('fluxcore_token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };
}

export const useWebsiteBuilderStore = create<WebsiteBuilderState>((set, get) => ({
  websiteConfig: null,
  loading: false,
  error: null,

  loadedAccountId: null,

  selectedPagePath: null,
  editContent: '',
  isEditing: false,

  isSaving: false,
  isBuilding: false,

  loadWebsite: async (accountId: string) => {
    const prevLoaded = get().loadedAccountId;
    set({
      loading: true,
      error: null,
      loadedAccountId: accountId,
      ...(prevLoaded !== accountId
        ? { selectedPagePath: null, editContent: '', isEditing: false }
        : {}),
    });
    try {
      const response = await fetch(`${API_URL}/websites/${accountId}`, {
        headers: authHeaders(),
      });

      if (response.status === 404) {
        set({ websiteConfig: null, loading: false });
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
      set({ websiteConfig: data.data, loading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Error al cargar datos del sitio web', websiteConfig: null, loading: false });
    }
  },

  createWebsite: async (accountId: string) => {
    set({ loading: true, error: null, loadedAccountId: accountId });
    try {
      const response = await fetch(`${API_URL}/websites/${accountId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create website');
      }

      const data = await response.json();
      set({ websiteConfig: data.data, loading: false });

      // Re-hidratar publicUrl absoluta desde el GET (backend la compone con PUBLIC_SITE_URL/host)
      await get().loadWebsite(accountId);
    } catch (err: any) {
      set({ error: err?.message || 'Error al crear el sitio web', loading: false });
    }
  },

  selectPage: (page: WebsitePage) => {
    set({
      selectedPagePath: page.path,
      editContent: page.content,
      isEditing: false,
      error: null,
    });
  },

  setEditContent: (content: string) => set({ editContent: content }),
  setIsEditing: (isEditing: boolean) => set({ isEditing }),

  saveSelectedPage: async (accountId: string) => {
    const { selectedPagePath, editContent, websiteConfig } = get();
    if (!selectedPagePath || !websiteConfig) return;

    set({ isSaving: true, error: null });
    try {
      const publicUrl = websiteConfig.publicUrl;
      const endpoint =
        selectedPagePath === '/'
          ? `${API_URL}/websites/${accountId}/pages`
          : `${API_URL}/websites/${accountId}/pages${selectedPagePath}`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save page (${response.status})`);
      }

      const data = await response.json();
      set({
        websiteConfig: { ...(data.data as WebsiteConfig), publicUrl },
        isSaving: false,
        isEditing: false,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Error al guardar la página', isSaving: false });
    }
  },

  addPage: async (accountId: string, path: string, title: string) => {
    set({ error: null });
    try {
      const publicUrl = get().websiteConfig?.publicUrl;
      const response = await fetch(`${API_URL}/websites/${accountId}/pages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          path: path.startsWith('/') ? path : `/${path}`,
          title,
          content: `# ${title}\n\nContenido de la página...`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add page');
      }

      const data = await response.json();
      set({ websiteConfig: { ...(data.data as WebsiteConfig), publicUrl } });
    } catch (err: any) {
      set({ error: err?.message || 'Error al crear la página' });
    }
  },

  buildWebsite: async (accountId: string) => {
    set({ isBuilding: true, error: null });
    try {
      const response = await fetch(`${API_URL}/websites/${accountId}/build`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to build website');
      }

      await get().loadWebsite(accountId);
    } catch (err: any) {
      set({ error: err?.message || 'Error al generar el sitio web' });
    } finally {
      set({ isBuilding: false });
    }
  },

  publishWebsite: async (accountId: string) => {
    set({ isSaving: true, error: null });
    try {
      await fetch(`${API_URL}/websites/${accountId}/build`, {
        method: 'POST',
        headers: authHeaders(),
      });

      const response = await fetch(`${API_URL}/websites/${accountId}/publish`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to publish website');
      }

      await get().loadWebsite(accountId);
    } catch (err: any) {
      set({ error: err?.message || 'Error al publicar el sitio web' });
    } finally {
      set({ isSaving: false });
    }
  },
}));

export type { WebsiteConfig, WebsitePage };
