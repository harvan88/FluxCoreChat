/**
 * FC-810: Account Store
 * Gestión centralizada de cuentas con Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { accountsApi } from '../services/accounts';
import type { Account } from '../types';

interface AccountState {
  // State
  accounts: Account[];
  activeAccountId: string | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  activeAccount: Account | null;
  personalAccounts: Account[];
  businessAccounts: Account[];

  // Actions
  loadAccounts: () => Promise<void>;
  setActiveAccount: (accountId: string) => void;
  createAccount: (data: {
    username: string;
    displayName: string;
    accountType: 'personal' | 'business';
  }) => Promise<Account | null>;
  updateAccount: (accountId: string, data: Partial<Account>) => Promise<boolean>;
  convertToBusiness: (accountId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      // Initial state
      accounts: [],
      activeAccountId: null,
      isLoading: false,
      error: null,

      // Computed getters
      get activeAccount() {
        const state = get();
        if (!state.activeAccountId) return null;
        return state.accounts.find((a) => a.id === state.activeAccountId) || null;
      },

      get personalAccounts() {
        return get().accounts.filter((a) => a.accountType === 'personal');
      },

      get businessAccounts() {
        return get().accounts.filter((a) => a.accountType === 'business');
      },

      // Actions
      loadAccounts: async () => {
        console.log('[AccountStore] loadAccounts called');
        set({ isLoading: true, error: null });

        try {
          const response = await accountsApi.getAll();
          console.log('[AccountStore] API response:', response);

          if (response.success && response.data) {
            const accounts = response.data;
            console.log('[AccountStore] Loaded accounts:', accounts.length);
            set({ accounts, isLoading: false });

            // Auto-select first account if none selected
            const state = get();
            if (!state.activeAccountId && accounts.length > 0) {
              console.log('[AccountStore] Auto-selecting first account:', accounts[0].id);
              set({ activeAccountId: accounts[0].id });
            }
          } else {
            console.error('[AccountStore] Error:', response.error);
            set({ error: response.error || 'Error al cargar cuentas', isLoading: false });
          }
        } catch (err: any) {
          console.error('[AccountStore] Exception:', err);
          set({ error: err.message || 'Error al cargar cuentas', isLoading: false });
        }
      },

      setActiveAccount: (accountId: string) => {
        const account = get().accounts.find((a) => a.id === accountId);
        if (account) {
          set({ activeAccountId: accountId });
        }
      },

      createAccount: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const response = await accountsApi.create(data);

          if (response.success && response.data) {
            const newAccount = response.data;
            set((state) => ({
              accounts: [...state.accounts, newAccount],
              isLoading: false,
            }));
            return newAccount;
          } else {
            set({ error: response.error || 'Error al crear cuenta', isLoading: false });
            return null;
          }
        } catch (err: any) {
          set({ error: err.message || 'Error al crear cuenta', isLoading: false });
          return null;
        }
      },

      updateAccount: async (accountId, data) => {
        set({ isLoading: true, error: null });

        try {
          const response = await accountsApi.update(accountId, data);

          if (response.success && response.data) {
            const updatedAccount = response.data;
            set((state) => ({
              accounts: state.accounts.map((a) =>
                a.id === accountId ? updatedAccount : a
              ),
              isLoading: false,
            }));
            return true;
          } else {
            set({ error: response.error || 'Error al actualizar cuenta', isLoading: false });
            return false;
          }
        } catch (err: any) {
          set({ error: err.message || 'Error al actualizar cuenta', isLoading: false });
          return false;
        }
      },

      convertToBusiness: async (accountId) => {
        set({ isLoading: true, error: null });

        try {
          const response = await accountsApi.convertToBusiness(accountId);

          if (response.success && response.data) {
            const updatedAccount = response.data;
            set((state) => ({
              accounts: state.accounts.map((a) =>
                a.id === accountId ? updatedAccount : a
              ),
              isLoading: false,
            }));
            return true;
          } else {
            set({ error: response.error || 'Error al convertir cuenta', isLoading: false });
            return false;
          }
        } catch (err: any) {
          set({ error: err.message || 'Error al convertir cuenta', isLoading: false });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'fluxcore-accounts',
      partialize: (state) => ({
        activeAccountId: state.activeAccountId,
      }),
    }
  )
);

// ============================================================================
// FC-815: useAccounts Hook
// ============================================================================

export function useAccounts() {
  const store = useAccountStore();

  return {
    accounts: store.accounts,
    activeAccount: store.activeAccount,
    activeAccountId: store.activeAccountId,
    personalAccounts: store.personalAccounts,
    businessAccounts: store.businessAccounts,
    isLoading: store.isLoading,
    error: store.error,
    loadAccounts: store.loadAccounts,
    setActiveAccount: store.setActiveAccount,
    createAccount: store.createAccount,
    updateAccount: store.updateAccount,
    convertToBusiness: store.convertToBusiness,
    clearError: store.clearError,
  };
}
