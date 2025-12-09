/**
 * FC-830: Workspaces API Client
 * Servicio para gestión de workspaces y colaboradores conectado a API real
 */

import type { ApiResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

export interface Workspace {
  id: string;
  accountId: string;
  name: string;
  description?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
  permissions: {
    canManageMembers?: boolean;
    canManageSettings?: boolean;
    canViewExtensions?: boolean;
    canManageExtensions?: boolean;
    modules?: string[];
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  workspace?: {
    id: string;
    name: string;
  };
}

export interface CreateWorkspaceData {
  accountId: string;
  name: string;
  description?: string;
}

export interface CreateInvitationData {
  email: string;
  role: 'admin' | 'operator' | 'viewer';
}

// ============================================================================
// Helper
// ============================================================================

function getToken(): string | null {
  return localStorage.getItem('fluxcore_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Error ${response.status}`,
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error de conexión',
    };
  }
}

// ============================================================================
// Workspaces API
// ============================================================================

export const workspacesApi = {
  /**
   * Get all workspaces for current user
   */
  async getAll(): Promise<ApiResponse<Workspace[]>> {
    return request<Workspace[]>('/workspaces');
  },

  /**
   * Get workspace by ID
   */
  async getById(id: string): Promise<ApiResponse<Workspace & { role: string; permissions: any }>> {
    return request<Workspace & { role: string; permissions: any }>(`/workspaces/${id}`);
  },

  /**
   * Create new workspace
   */
  async create(data: CreateWorkspaceData): Promise<ApiResponse<Workspace>> {
    return request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update workspace
   */
  async update(
    id: string,
    data: Partial<Pick<Workspace, 'name' | 'description' | 'settings'>>
  ): Promise<ApiResponse<Workspace>> {
    return request<Workspace>(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete workspace
   */
  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return request<{ message: string }>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================================================
  // Members
  // ============================================================================

  /**
   * Get workspace members
   */
  async getMembers(workspaceId: string): Promise<ApiResponse<WorkspaceMember[]>> {
    return request<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
  },

  /**
   * Add member to workspace
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: string = 'operator'
  ): Promise<ApiResponse<WorkspaceMember>> {
    return request<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  /**
   * Update member role/permissions
   */
  async updateMember(
    workspaceId: string,
    userId: string,
    data: { role?: string; permissions?: any }
  ): Promise<ApiResponse<WorkspaceMember>> {
    return request<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return request<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // ============================================================================
  // Invitations
  // ============================================================================

  /**
   * Get pending invitations for workspace
   */
  async getInvitations(workspaceId: string): Promise<ApiResponse<WorkspaceInvitation[]>> {
    return request<WorkspaceInvitation[]>(`/workspaces/${workspaceId}/invitations`);
  },

  /**
   * Create invitation
   */
  async createInvitation(
    workspaceId: string,
    data: CreateInvitationData
  ): Promise<ApiResponse<WorkspaceInvitation>> {
    return request<WorkspaceInvitation>(`/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Cancel invitation
   */
  async cancelInvitation(
    workspaceId: string,
    invitationId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return request<{ message: string }>(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Accept invitation by token
   */
  async acceptInvitation(token: string): Promise<ApiResponse<WorkspaceMember>> {
    return request<WorkspaceMember>(`/workspaces/invitations/${token}/accept`, {
      method: 'POST',
    });
  },

  /**
   * Get pending invitations for current user (by email)
   */
  async getMyPendingInvitations(): Promise<ApiResponse<WorkspaceInvitation[]>> {
    // This endpoint might need to be implemented in backend
    // For now, we'll return empty array
    return { success: true, data: [] };
  },
};
