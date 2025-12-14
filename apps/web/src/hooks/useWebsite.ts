/**
 * useWebsite Hook
 * Extension Karen - Website Builder
 * Hook para gestionar el estado del sitio web
 */

import { useState, useCallback } from 'react';

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

interface UseWebsiteResult {
  config: WebsiteConfig | null;
  loading: boolean;
  error: string | null;
  load: (accountId: string) => Promise<void>;
  create: (accountId: string) => Promise<WebsiteConfig | null>;
  updatePage: (accountId: string, path: string, content: string) => Promise<boolean>;
  addPage: (accountId: string, page: { path: string; title: string; content: string }) => Promise<boolean>;
  deletePage: (accountId: string, path: string) => Promise<boolean>;
  build: (accountId: string) => Promise<boolean>;
  publish: (accountId: string) => Promise<boolean>;
  unpublish: (accountId: string) => Promise<boolean>;
}

export function useWebsite(): UseWebsiteResult {
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const load = useCallback(async (accountId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/websites/${accountId}`, {
        headers: getAuthHeaders(),
      });
      
      if (response.status === 404) {
        setConfig(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to load website config');
      }
      
      const data = await response.json();
      setConfig(data.data);
    } catch (err: any) {
      setError(err.message);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (accountId: string): Promise<WebsiteConfig | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/websites/${accountId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create website');
      }
      
      const data = await response.json();
      setConfig(data.data);
      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePage = useCallback(async (accountId: string, path: string, content: string): Promise<boolean> => {
    setError(null);
    
    try {
      const pagePath = path === '/' ? '' : path;
      const response = await fetch(`${API_URL}/websites/${accountId}/pages${pagePath}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update page');
      }
      
      const data = await response.json();
      setConfig(data.data);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const addPage = useCallback(async (accountId: string, page: { path: string; title: string; content: string }): Promise<boolean> => {
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/websites/${accountId}/pages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(page),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add page');
      }
      
      const data = await response.json();
      setConfig(data.data);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const deletePage = useCallback(async (accountId: string, path: string): Promise<boolean> => {
    setError(null);
    
    try {
      const pagePath = path === '/' ? '' : path;
      const response = await fetch(`${API_URL}/websites/${accountId}/pages${pagePath}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete page');
      }
      
      const data = await response.json();
      setConfig(data.data);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const build = useCallback(async (accountId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/websites/${accountId}/build`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to build website');
      }
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const publish = useCallback(async (accountId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Build first
      await fetch(`${API_URL}/websites/${accountId}/build`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      // Then publish
      const response = await fetch(`${API_URL}/websites/${accountId}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to publish website');
      }
      
      await load(accountId);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [load]);

  const unpublish = useCallback(async (accountId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/websites/${accountId}/unpublish`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to unpublish website');
      }
      
      await load(accountId);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [load]);

  return {
    config,
    loading,
    error,
    load,
    create,
    updatePage,
    addPage,
    deletePage,
    build,
    publish,
    unpublish,
  };
}

export default useWebsite;
