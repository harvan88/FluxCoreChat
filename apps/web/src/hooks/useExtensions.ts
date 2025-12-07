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
      const response = await fetch(`${API_URL}/extensions/available`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load available extensions');
      }

      const data = await response.json();
      setExtensions(data.map((ext: any) => ({
        ...ext,
        status: 'available',
      })));
    } catch (err: any) {
      setError(err.message);
      // Mock data for development
      setExtensions([
        {
          id: 'core-ai',
          name: 'FluxCore AI',
          version: '1.0.0',
          description: 'Asistente de IA integrado para respuestas automáticas',
          author: 'FluxCore Team',
          icon: '🤖',
          permissions: ['read:messages', 'send:messages', 'modify:automation'],
          status: 'enabled',
        },
        {
          id: 'appointments',
          name: 'Citas y Reservas',
          version: '1.0.0',
          description: 'Gestión de citas y reservas para tu negocio',
          author: 'FluxCore Team',
          icon: '📅',
          permissions: ['read:messages', 'send:messages'],
          status: 'available',
        },
        {
          id: 'analytics',
          name: 'Analytics',
          version: '0.9.0',
          description: 'Estadísticas y análisis de conversaciones',
          author: 'Community',
          icon: '📊',
          permissions: ['read:messages', 'read:stats'],
          status: 'disabled',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar extensiones instaladas
  const loadInstalled = useCallback(async () => {
    if (!accountId) return;

    try {
      const response = await fetch(`${API_URL}/extensions/installed?accountId=${accountId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load installed extensions');
      }

      const data = await response.json();
      setInstallations(data);
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
      const response = await fetch(`${API_URL}/extensions/uninstall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ extensionId, accountId }),
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
      const response = await fetch(`${API_URL}/extensions/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ extensionId, accountId, enabled }),
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
      const response = await fetch(`${API_URL}/extensions/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ extensionId, accountId, config }),
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
