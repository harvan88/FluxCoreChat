/**
 * HITO-API-AUTOMATION: useAutomation Hook
 * 
 * Gestiona el estado de automatización en el frontend.
 */

import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Modos de automatización
 */
export type AutomationMode = 'automatic' | 'supervised' | 'disabled';

/**
 * Regla de automatización
 */
export interface AutomationRule {
  id: string;
  accountId: string;
  relationshipId: string | null;
  mode: AutomationMode;
  enabled: boolean;
  config: AutomationConfig | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Configuración de automatización
 */
export interface AutomationConfig {
  triggers?: AutomationTrigger[];
  conditions?: AutomationCondition[];
  delayMs?: number;
  extensionId?: string;
  rateLimit?: number;
}

/**
 * Trigger de automatización
 */
export interface AutomationTrigger {
  type: 'message_received' | 'keyword' | 'schedule' | 'webhook';
  value?: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Condición de automatización
 */
export interface AutomationCondition {
  field: string;
  operator: string;
  value: string | string[];
}

/**
 * Resultado de evaluación
 */
export interface TriggerEvaluation {
  shouldProcess: boolean;
  mode: AutomationMode;
  rule: AutomationRule | null;
  reason: string;
}

/**
 * Hook para gestionar automatización
 */
export function useAutomation(accountId: string | null) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [currentMode, setCurrentMode] = useState<AutomationMode>('disabled');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('fluxcore_token');

  // Cargar reglas de automatización
  const loadRules = useCallback(async () => {
    if (!accountId) return;

    const token = getAuthToken();
    if (!token) {
      setError('No hay sesión activa');
      setRules([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/automation/rules/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Manejar errores específicos por código HTTP
      if (response.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setRules([]);
        return;
      }
      
      if (response.status === 403) {
        setError('No tienes permiso para ver las reglas de automatización.');
        setRules([]);
        return;
      }
      
      if (response.status === 404) {
        // No hay reglas configuradas - no es un error
        setRules([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudieron cargar las reglas`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setRules(result.data);
      }
    } catch (err: any) {
      // Errores de red específicos
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('No se puede conectar al servidor. Verifica tu conexión.');
      } else {
        setError(err.message || 'Error al cargar reglas de automatización');
      }
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  // Obtener modo efectivo
  const loadMode = useCallback(async (relationshipId?: string) => {
    if (!accountId) return;

    try {
      const url = relationshipId 
        ? `${API_URL}/automation/mode/${accountId}?relationshipId=${relationshipId}`
        : `${API_URL}/automation/mode/${accountId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get automation mode');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setCurrentMode(result.data.mode);
        return result.data;
      }
    } catch (err: any) {
      console.warn('[useAutomation] Could not load mode:', err.message);
      return { mode: 'disabled', rule: null, source: 'default' };
    }
  }, [accountId]);

  // Crear o actualizar regla
  const setRule = useCallback(async (
    mode: AutomationMode,
    options: {
      relationshipId?: string;
      config?: AutomationConfig;
      enabled?: boolean;
    } = {}
  ) => {
    if (!accountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/automation/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          accountId,
          mode,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set automation rule');
      }

      const result = await response.json();
      await loadRules();
      return result.data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, loadRules]);

  // Registrar trigger
  const registerTrigger = useCallback(async (
    trigger: AutomationTrigger,
    options: {
      relationshipId?: string;
      mode?: AutomationMode;
    } = {}
  ) => {
    if (!accountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/automation/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          accountId,
          trigger,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register trigger');
      }

      const result = await response.json();
      await loadRules();
      return result.data as { rule: AutomationRule; trigger: AutomationTrigger } | undefined;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, loadRules]);

  // Eliminar regla
  const deleteRule = useCallback(async (ruleId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/automation/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      await loadRules();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadRules]);

  // Actualizar regla por ID
  const updateRule = useCallback(async (
    ruleId: string,
    updates: {
      mode?: AutomationMode;
      enabled?: boolean;
      config?: AutomationConfig | null;
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/automation/rules/${ruleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      const result = await response.json();
      await loadRules();
      return result.data as AutomationRule | null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, loadRules]);

  const resetError = useCallback(() => setError(null), []);

  // Evaluar trigger (para testing)
  const evaluate = useCallback(async (context: {
    relationshipId?: string;
    messageContent?: string;
    messageType?: string;
    senderId?: string;
  }) => {
    if (!accountId) return null;

    try {
      const response = await fetch(`${API_URL}/automation/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          accountId,
          ...context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate');
      }

      const result = await response.json();
      return result.data as TriggerEvaluation;
    } catch (err: any) {
      console.warn('[useAutomation] Evaluation failed:', err.message);
      return null;
    }
  }, [accountId]);

  // Cargar datos iniciales
  useEffect(() => {
    loadRules();
    loadMode();
  }, [loadRules, loadMode]);

  // Obtener regla global (sin relationship)
  const globalRule = rules.find(r => r.relationshipId === null);

  // Obtener reglas específicas por relationship
  const relationshipRules = rules.filter(r => r.relationshipId !== null);

  return {
    rules,
    globalRule,
    relationshipRules,
    currentMode,
    isLoading,
    error,
    loadRules,
    loadMode,
    setRule,
    registerTrigger,
    deleteRule,
    evaluate,
    updateRule,
    resetError,
  };
}
