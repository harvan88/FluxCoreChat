/**
 * FC-816: Accounts API Client
 * Servicio para gestión de cuentas conectado a API real
 */

import { api } from './api';
import type { Account, ApiResponse } from '../types';

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

  /**
   * Buscar usuarios por alias/username
   */
  async searchUsers(query: string): Promise<ApiResponse<Account[]>> {
    // Note: This endpoint might need to be implemented in the backend
    // For now, we filter from getAccounts
    const response = await api.getAccounts();
    if (response.success && response.data) {
      const filtered = response.data.filter(
        (account) =>
          account.username?.toLowerCase().includes(query.toLowerCase()) ||
          account.displayName?.toLowerCase().includes(query.toLowerCase())
      );
      return { success: true, data: filtered };
    }
    return response;
  },
};
