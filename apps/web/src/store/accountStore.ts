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
  activeActorId: string | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  activeAccount: Account | null;
  personalAccounts: Account[];
  businessAccounts: Account[];

  // Actions
  loadAccounts: () => Promise<void>;
  setActiveAccount: (accountId: string) => void;
  setActiveActor: (actorId: string) => void;
  loadActorForAccount: (accountId: string) => Promise<void>;
  createAccount: (data: {
    alias: string;
    displayName: string;
    accountType: 'personal' | 'business';
  }) => Promise<Account | null>;
  updateAccount: (accountId: string, data: Partial<Account>) => Promise<boolean>;
  convertToBusiness: (accountId: string) => Promise<boolean>;
  clearError: () => void;
  updateAccountState: (accountId: string, data: Partial<Account>) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      // Initial state
      accounts: [],
      activeAccountId: null,
      activeActorId: null,
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
        console.trace('[AccountStore] loadAccounts called from:');
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
              // Load actor for auto-selected account
              get().loadActorForAccount(accounts[0].id);
            } else if (state.activeAccountId) {
              // Load actor for existing active account
              console.log('[AccountStore] Loading actor for existing active account:', state.activeAccountId);
              get().loadActorForAccount(state.activeAccountId);
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
          // Load corresponding actor
          get().loadActorForAccount(accountId);
        }
      },

      setActiveActor: (actorId: string) => {
        const current = get().activeActorId;
        console.log('[AccountStore] setActiveActor current:', current, '→ new:', actorId, 'same?', current === actorId);
        if (current !== actorId) {
          set({ activeActorId: actorId });
        }
      },

      loadActorForAccount: async (accountId: string) => {
        console.log(`[AccountStore] Loading actor for account: ${accountId}`);
        try {
          const response = await accountsApi.getActorForAccount(accountId);
          console.log(`[AccountStore] Actor response:`, response);
          if (response.success && response.data?.actorId) {
            console.log(`[AccountStore] Setting activeActorId to: ${response.data.actorId}`);
            const current = get().activeActorId;
            console.log('[AccountStore] loadActorForAccount current:', current, '→ new:', response.data.actorId, 'same?', current === response.data.actorId);
            if (current !== response.data.actorId) {
              set({ activeActorId: response.data.actorId });
            }
          } else {
            console.warn(`[AccountStore] No actor found for account: ${accountId}, using fallback`);
            // Fallback: try to resolve from existing messages or use accountId as placeholder
            set({ activeActorId: accountId }); // Temporary fallback
          }
        } catch (err) {
          console.error('[AccountStore] Error loading actor for account:', err);
          // Fallback: use accountId as placeholder
          set({ activeActorId: accountId });
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

      updateAccountState: (accountId, data) => {
        set((state) => ({
          accounts: state.accounts.map((account) => {
            if (account.id !== accountId) {
              return account;
            }

            const { profile: profilePatch, ...rest } = data;
            const existingProfile =
              account.profile && typeof account.profile === 'object'
                ? account.profile
                : {};

            return {
              ...account,
              ...rest,
              profile: profilePatch
                ? { ...existingProfile, ...profilePatch }
                : (account.profile ?? existingProfile),
            } as Account;
          }),
        }));
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
    activeActorId: store.activeActorId,
    personalAccounts: store.personalAccounts,
    businessAccounts: store.businessAccounts,
    isLoading: store.isLoading,
    error: store.error,
    loadAccounts: store.loadAccounts,
    setActiveAccount: store.setActiveAccount,
    setActiveActor: store.setActiveActor,
    createAccount: store.createAccount,
    updateAccount: store.updateAccount,
    convertToBusiness: store.convertToBusiness,
    clearError: store.clearError,
  };
}
