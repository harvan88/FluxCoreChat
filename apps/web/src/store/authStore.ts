/**
 * Auth Store - Gestión del estado de autenticación
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, RegisterData } from '../types';
import { api } from '../services/api';
import { useUIStore } from './uiStore';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
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
          
          // SRG-005: Set selectedAccountId and accounts in uiStore
          const accounts = response.data.accounts || [];
          if (accounts.length > 0) {
            useUIStore.getState().setAccounts(accounts);
            useUIStore.getState().setSelectedAccount(accounts[0].id);
          }
          
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
          
          // SRG-005: Also set accounts after registration
          const accounts = response.data.accounts || [];
          if (accounts.length > 0) {
            useUIStore.getState().setAccounts(accounts);
            useUIStore.getState().setSelectedAccount(accounts[0].id);
          }
          
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
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      initFromStorage: () => {
        const token = api.getToken();
        if (token) {
          set({ token, isAuthenticated: true });
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
    }
  )
);
