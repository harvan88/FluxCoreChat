/**
 * HITO-API-AUTOMATION: useAutomation Hook
 * 
 * Gestiona el estado de automatización en el frontend.
 */

import { useState, useEffect, useCallback } from 'react';

import { getApiUrl } from '../utils/urls';
const API_URL = getApiUrl();

/**
 * Modos de automatización
 */
export type AutomationMode = 'auto' | 'suggest' | 'off';

const AUTOMATION_UPDATE_EVENT = 'fluxcore:automation-update';

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

const getAuthToken = () => localStorage.getItem('fluxcore_token');

import { useAutomationStore } from '../store/automationStore';

/**
 * Hook para gestionar automatización
 */
export function useAutomation(accountId: string | null, relationshipId?: string) {
  const store = useAutomationStore();
  
  const currentMode = store.getMode(relationshipId || null);
  const isLoading = store.isLoading;
  const error = store.error;

  const setRule = useCallback(async (
    mode: AutomationMode,
    options: {
      relationshipId?: string;
      config?: AutomationConfig;
      enabled?: boolean;
    } = {}
  ) => {
    if (!accountId) return;
    return store.setRule(accountId, options.relationshipId || relationshipId || null, mode);
  }, [accountId, relationshipId, store]);

  const loadRules = useCallback(() => {
    if (accountId) return store.fetchRules(accountId);
  }, [accountId, store]);

  const loadMode = useCallback(async () => {
    // Mode is already in store after fetchRules
    return { mode: currentMode };
  }, [currentMode]);

  return {
    rules: Object.values(store.rules),
    currentMode,
    isLoading,
    error,
    loadRules,
    loadMode,
    setRule,
    // Add stub for other methods to avoid breaking existing code if any
    registerTrigger: async () => {},
    deleteRule: async () => {},
    evaluate: async () => null,
    updateRule: async () => null,
    resetError: () => {},
  };
}
