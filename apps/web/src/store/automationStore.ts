import { create } from 'zustand';
import { getApiUrl } from '../utils/urls';

const API_URL = getApiUrl();
const getAuthToken = () => localStorage.getItem('fluxcore_token');

export type AutomationMode = 'auto' | 'suggest' | 'off';

export interface AutomationRule {
  id: string;
  accountId: string;
  relationshipId: string | null;
  mode: AutomationMode;
  enabled: boolean;
  config: any;
}

interface AutomationState {
  rules: Record<string, AutomationRule>; // Key: relationshipId || 'global'
  isLoading: boolean;
  error: string | null;
  
  fetchRules: (accountId: string) => Promise<void>;
  setRule: (accountId: string, relationshipId: string | null, mode: AutomationMode) => Promise<void>;
  getMode: (relationshipId: string | null) => AutomationMode;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  rules: {},
  isLoading: false,
  error: null,

  fetchRules: async (accountId: string) => {
    if (!accountId) return;
    
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/automation/rules/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load rules');
      
      const result = await response.json();
      if (result.success && result.data) {
        const rulesMap: Record<string, AutomationRule> = {};
        result.data.forEach((rule: AutomationRule) => {
          const key = rule.relationshipId || 'global';
          rulesMap[key] = rule;
        });
        set({ rules: rulesMap, isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setRule: async (accountId, relationshipId, mode) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_URL}/automation/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          accountId,
          relationshipId,
          mode,
          enabled: true
        }),
      });

      if (!response.ok) throw new Error('Failed to update rule');
      
      const result = await response.json();
      if (result.success && result.data) {
        const key = relationshipId || 'global';
        set((state) => ({
          rules: {
            ...state.rules,
            [key]: result.data
          },
          isLoading: false
        }));
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  getMode: (relationshipId) => {
    const { rules } = get();
    const key = relationshipId || 'global';
    
    if (rules[key]) return rules[key].mode;
    if (rules['global']) return rules['global'].mode;
    
    return 'off';
  }
}));
