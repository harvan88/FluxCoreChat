/**
 * Auth Store - Gestión del estado de autenticación
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, RegisterData } from '../types';
import { api } from '../services/api';
import { useUIStore } from './uiStore';
import { useAccountStore } from './accountStore';
import { useWorkspaceStore } from './workspaceStore';
import { syncManager } from '../db/sync';
import { setCurrentAccountDB } from '../db';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  initFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: true,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        const response = await api.login(credentials);

        if (response.success && response.data) {
          // Set user and auth state
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          api.setCurrentUserId(response.data.user?.id ?? null);
          
          // Set auth token in syncManager for API calls
          syncManager.setAuthToken(response.data.token);
          
          // SRG-005: Set selectedAccountId and accounts in uiStore
          const accounts = response.data.accounts || [];
          if (accounts.length > 0) {
            useUIStore.getState().setAccounts(accounts);

            // Solo auto-seleccionar si hay una única cuenta.
            const resolvedAccountId = accounts.length === 1 ? accounts[0].id : null;

            useUIStore.getState().setSelectedAccount(resolvedAccountId);
            useAccountStore.setState({
              accounts,
              activeAccountId: resolvedAccountId,
              isLoading: false,
              error: null,
            });
            if (resolvedAccountId) setCurrentAccountDB(resolvedAccountId);
          }
          
          // EXT-1: También cargar en accountStore para sincronización
          useAccountStore.getState().loadAccounts();
          
          return true;
        } else {
          set({
            error: response.error || 'Error al iniciar sesión',
            isLoading: false,
          });
          return false;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        const response = await api.register(data);

        if (response.success && response.data) {
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          api.setCurrentUserId(response.data.user?.id ?? null);
          
          // Set auth token in syncManager
          syncManager.setAuthToken(response.data.token);
          
          // SRG-005: Also set accounts after registration
          const accounts = response.data.accounts || [];
          if (accounts.length > 0) {
            useUIStore.getState().setAccounts(accounts);

            // Solo auto-seleccionar si hay una única cuenta tras registro.
            const resolvedAccountId = accounts.length === 1 ? accounts[0].id : null;

            useUIStore.getState().setSelectedAccount(resolvedAccountId);
            useAccountStore.setState({
              accounts,
              activeAccountId: resolvedAccountId,
              isLoading: false,
              error: null,
            });
            if (resolvedAccountId) setCurrentAccountDB(resolvedAccountId);
          }
          
          // EXT-1: También cargar en accountStore para sincronización
          useAccountStore.getState().loadAccounts();
          
          return true;
        } else {
          set({
            error: response.error || 'Error al registrarse',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        api.logout();
        syncManager.setAuthToken(null);
        
        // Limpiar contextos para que el próximo login pase por el selector
        useAccountStore.setState({ activeAccountId: null, activeActorId: null });
        useWorkspaceStore.getState().reset();
        useUIStore.getState().setSelectedAccount(null);
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      initFromStorage: async () => {
        console.log('[AuthStore] initFromStorage called');
        const token = api.getToken();
        console.log('[AuthStore] Token exists:', !!token);
        
        if (token) {
          set({ token, isAuthenticated: true });
          
          // Set auth token in syncManager
          syncManager.setAuthToken(token);
          
          // Cargar cuentas del usuario si hay token
          try {
            console.log('[AuthStore] Loading accounts...');
            const response = await api.getAccounts();
            console.log('[AuthStore] Accounts response:', response);
            
            if (response.success && response.data && response.data.length > 0) {
              console.log('[AuthStore] Setting accounts in uiStore:', response.data.length);
              const accounts = response.data;
              useUIStore.getState().setAccounts(accounts);

              const urlParams = new URLSearchParams(window.location.search);
              const urlAccountId = urlParams.get('a');

              const isValid = (id: string | null) => !!id && accounts.some(a => a.id === id);
              const uiSelectedId = useUIStore.getState().selectedAccountId;
              const storeSelectedId = useAccountStore.getState().activeAccountId;

              const personalAccount = accounts.find(a => a.accountType === 'personal');
              
              // PRIORIDAD DETERMINISTA: URL > Persistencia > Personal > Primera
              const resolvedAccountId =
                (isValid(urlAccountId) && urlAccountId) ||
                (isValid(uiSelectedId) && uiSelectedId) ||
                (isValid(storeSelectedId) && storeSelectedId) ||
                (personalAccount?.id) ||
                accounts[0].id;

              console.log('[AuthStore] Context resolved (URL priority):', resolvedAccountId);

              console.log('[AuthStore] Resolved accountId on init:', resolvedAccountId);
              
              if (resolvedAccountId) {
                useUIStore.getState().setSelectedAccount(resolvedAccountId);
                useAccountStore.setState({
                  accounts,
                  activeAccountId: resolvedAccountId,
                  isLoading: false,
                  error: null,
                });
                setCurrentAccountDB(resolvedAccountId);
              }
            }
            
            // EXT-1: También cargar en accountStore
            console.log('[AuthStore] Loading accounts in accountStore...');
            await useAccountStore.getState().loadAccounts();
            set({ isInitializing: false });
          } catch (err) {
            console.error('[AuthStore] Error loading accounts on init:', err);
            set({ isInitializing: false });
          }
        } else {
          api.setCurrentUserId(null);
          set({ isInitializing: false });
        }
      },
    }),
    {
      name: 'fluxcore-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.token) {
          api.setToken(state.token);
        }
        api.setCurrentUserId(state.user?.id ?? null);
      },
    }
  )
);
