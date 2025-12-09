/**
 * COR-045: useExtensions Hook
 * 
 * Gestiona el estado de extensiones en el frontend.
 */

import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Información de extensión
 */
export interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  permissions: string[];
  status: 'available' | 'installed' | 'enabled' | 'disabled';
}

/**
 * Instalación de extensión
 */
export interface ExtensionInstallation {
  id: string;
  extensionId: string;
  accountId: string;
  enabled: boolean;
  grantedPermissions: string[];
  config: Record<string, unknown>;
  installedAt: string;
}

/**
 * Hook para gestionar extensiones
 */
export function useExtensions(accountId: string | null) {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [installations, setInstallations] = useState<ExtensionInstallation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener token de auth del localStorage
  const getAuthToken = () => {
    return localStorage.getItem('fluxcore_token');
  };

  // Cargar extensiones disponibles
  const loadAvailable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/extensions`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load available extensions');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setExtensions(result.data.map((ext: any) => ({
          id: ext.id,
          name: ext.name,
          version: ext.version,
          description: ext.description || '',
          author: ext.author || 'Unknown',
          icon: ext.icon,
          permissions: ext.permissions || [],
          status: 'available' as const,
        })));
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar extensiones');
      // NO MOCK DATA - Mostrar lista vacía y error
      setExtensions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar extensiones instaladas
  const loadInstalled = useCallback(async () => {
    if (!accountId) return;

    try {
      const response = await fetch(`${API_URL}/extensions/installed/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load installed extensions');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setInstallations(result.data.map((inst: any) => ({
          id: inst.id,
          extensionId: inst.extensionId,
          accountId: inst.accountId,
          enabled: inst.enabled,
          grantedPermissions: inst.grantedPermissions || [],
          config: inst.config || {},
          installedAt: inst.installedAt,
        })));
      }
    } catch (err: any) {
      console.warn('[useExtensions] Could not load installations:', err.message);
    }
  }, [accountId]);

  // Instalar extensión
  const install = useCallback(async (extensionId: string) => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/extensions/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ extensionId, accountId }),
      });

      if (!response.ok) {
        throw new Error('Failed to install extension');
      }

      await loadInstalled();
      await loadAvailable();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, loadInstalled, loadAvailable]);

  // Desinstalar extensión
  const uninstall = useCallback(async (extensionId: string) => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const encodedExtId = encodeURIComponent(extensionId);
      const response = await fetch(`${API_URL}/extensions/${accountId}/${encodedExtId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to uninstall extension');
      }

      await loadInstalled();
      await loadAvailable();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, loadInstalled, loadAvailable]);

  // Habilitar/deshabilitar extensión
  const toggle = useCallback(async (extensionId: string, enabled: boolean) => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const encodedExtId = encodeURIComponent(extensionId);
      const action = enabled ? 'enable' : 'disable';
      const response = await fetch(`${API_URL}/extensions/${accountId}/${encodedExtId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle extension');
      }

      await loadInstalled();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, loadInstalled]);

  // Actualizar configuración
  const updateConfig = useCallback(async (
    extensionId: string, 
    config: Record<string, unknown>
  ) => {
    if (!accountId) return;

    try {
      const encodedExtId = encodeURIComponent(extensionId);
      const response = await fetch(`${API_URL}/extensions/${accountId}/${encodedExtId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error('Failed to update config');
      }

      await loadInstalled();
    } catch (err: any) {
      setError(err.message);
    }
  }, [accountId, loadInstalled]);

  // Cargar datos iniciales
  useEffect(() => {
    loadAvailable();
    loadInstalled();
  }, [loadAvailable, loadInstalled]);

  // Combinar extensiones con estado de instalación
  const extensionsWithStatus = extensions.map(ext => {
    const installation = installations.find(i => i.extensionId === ext.id);
    return {
      ...ext,
      status: installation 
        ? (installation.enabled ? 'enabled' : 'disabled')
        : 'available',
      installation,
    } as Extension & { installation?: ExtensionInstallation };
  });

  return {
    extensions: extensionsWithStatus,
    installations,
    isLoading,
    error,
    install,
    uninstall,
    toggle,
    updateConfig,
    refresh: () => {
      loadAvailable();
      loadInstalled();
    },
  };
}
