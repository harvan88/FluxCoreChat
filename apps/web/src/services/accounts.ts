/**
 * FC-816: Accounts API Client
 * Servicio para gestión de cuentas conectado a API real
 */

import { api } from './api';
import type { Account, AccountDeletionJob, ApiResponse } from '../types';

export interface CreateAccountData {
  username: string;
  displayName: string;
  accountType: 'personal' | 'business';
  profile?: {
    bio?: string;
    avatarUrl?: string;
  };
  privateContext?: string;
}

export interface UpdateAccountData {
  displayName?: string;
  profile?: {
    bio?: string;
    avatarUrl?: string;
    businessRequested?: boolean;
  };
  privateContext?: string;
}

export const accountsApi = {
  /**
   * Obtener todas las cuentas del usuario
   */
  async getAll(): Promise<ApiResponse<Account[]>> {
    return api.getAccounts();
  },

  /**
   * Obtener cuenta por ID
   */
  async getById(id: string): Promise<ApiResponse<Account>> {
    return api.getAccount(id);
  },

  /**
   * Crear nueva cuenta
   */
  async create(data: CreateAccountData): Promise<ApiResponse<Account>> {
    return api.createAccount(data);
  },

  /**
   * Actualizar cuenta
   */
  async update(id: string, data: UpdateAccountData): Promise<ApiResponse<Account>> {
    return api.updateAccount(id, data);
  },

  /**
   * Convertir cuenta personal a negocio
   */
  async convertToBusiness(id: string): Promise<ApiResponse<Account>> {
    return api.convertToBusiness(id);
  },

  async requestDeletion(id: string, sessionAccountId?: string): Promise<ApiResponse<AccountDeletionJob>> {
    return api.requestAccountDeletion(id, sessionAccountId);
  },

  async prepareDeletionSnapshot(id: string): Promise<ApiResponse<AccountDeletionJob>> {
    return api.prepareAccountDeletionSnapshot(id);
  },

  async acknowledgeDeletionSnapshot(
    id: string,
    payload: { downloaded?: boolean; consent?: boolean }
  ): Promise<ApiResponse<AccountDeletionJob>> {
    return api.acknowledgeAccountDeletionSnapshot(id, payload);
  },

  async downloadDeletionSnapshot(id: string): Promise<Blob> {
    return api.downloadAccountDeletionSnapshot(id);
  },

  async confirmDeletion(id: string): Promise<ApiResponse<AccountDeletionJob>> {
    return api.confirmAccountDeletion(id);
  },

  async getAccountDeletionJob(id: string): Promise<ApiResponse<AccountDeletionJob | null>> {
    return api.getAccountDeletionJob(id);
  },

  /**
   * Buscar usuarios por alias/username
   * Usa el endpoint backend /accounts/search para búsqueda eficiente
   */
  async searchUsers(query: string): Promise<ApiResponse<Account[]>> {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    try {
      const token = localStorage.getItem('fluxcore_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(
        `${API_URL}/accounts/search?q=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // Fallback a búsqueda local si el endpoint falla
        console.warn('[accountsApi] Search endpoint failed, falling back to local filter');
        const localResponse = await api.getAccounts();
        if (localResponse.success && localResponse.data) {
          const filtered = localResponse.data.filter(
            (account) =>
              account.username?.toLowerCase().includes(query.toLowerCase()) ||
              account.displayName?.toLowerCase().includes(query.toLowerCase())
          );
          return { success: true, data: filtered };
        }
        return localResponse;
      }

      return await response.json();
    } catch (error: any) {
      console.error('[accountsApi] Search error:', error);
      return { success: false, error: error.message };
    }
  },
};
