/**
 * FC-821: Workspace Store
 * FC-820: useWorkspaces Hook
 * FC-826: useInvitations Hook
 * Gestión centralizada de workspaces y colaboradores
 */

import { create } from 'zustand';
import {
  workspacesApi,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceInvitation,
} from '../services/workspaces';

// ============================================================================
// Store Interface
// ============================================================================

interface WorkspaceState {
  // State
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  pendingInvitations: WorkspaceInvitation[]; // For current user
  isLoading: boolean;
  error: string | null;

  // Actions - Workspaces
  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => void;
  createWorkspace: (data: { accountId: string; name: string; description?: string }) => Promise<Workspace | null>;
  updateWorkspace: (workspaceId: string, data: { name?: string; description?: string }) => Promise<boolean>;
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;

  // Actions - Members
  loadMembers: (workspaceId: string) => Promise<void>;
  addMember: (workspaceId: string, userId: string, role?: string) => Promise<boolean>;
  updateMember: (workspaceId: string, userId: string, data: { role?: string; permissions?: any }) => Promise<boolean>;
  removeMember: (workspaceId: string, userId: string) => Promise<boolean>;

  // Actions - Invitations
  loadInvitations: (workspaceId: string) => Promise<void>;
  createInvitation: (workspaceId: string, email: string, role: 'admin' | 'operator' | 'viewer') => Promise<boolean>;
  cancelInvitation: (workspaceId: string, invitationId: string) => Promise<boolean>;
  acceptInvitation: (token: string) => Promise<boolean>;
  loadPendingInvitations: () => Promise<void>;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  workspaces: [],
  activeWorkspaceId: null,
  members: [],
  invitations: [],
  pendingInvitations: [],
  isLoading: false,
  error: null,

  // ============================================================================
  // Workspace Actions
  // ============================================================================

  loadWorkspaces: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.getAll();

      if (response.success && response.data) {
        set({ workspaces: response.data, isLoading: false });

        // Auto-select first workspace if none selected
        const state = get();
        if (!state.activeWorkspaceId && response.data.length > 0) {
          set({ activeWorkspaceId: response.data[0].id });
        }
      } else {
        set({ error: response.error || 'Error al cargar workspaces', isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al cargar workspaces', isLoading: false });
    }
  },

  setActiveWorkspace: (workspaceId: string) => {
    const workspace = get().workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      set({ activeWorkspaceId: workspaceId, members: [], invitations: [] });
      // Load members and invitations for new workspace
      get().loadMembers(workspaceId);
      get().loadInvitations(workspaceId);
    }
  },

  createWorkspace: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.create(data);

      if (response.success && response.data) {
        const newWorkspace = response.data;
        set((state) => ({
          workspaces: [...state.workspaces, newWorkspace],
          isLoading: false,
        }));
        return newWorkspace;
      } else {
        set({ error: response.error || 'Error al crear workspace', isLoading: false });
        return null;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al crear workspace', isLoading: false });
      return null;
    }
  },

  updateWorkspace: async (workspaceId, data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.update(workspaceId, data);

      if (response.success && response.data) {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId ? response.data! : w
          ),
          isLoading: false,
        }));
        return true;
      } else {
        set({ error: response.error || 'Error al actualizar', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al actualizar', isLoading: false });
      return false;
    }
  },

  deleteWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.delete(workspaceId);

      if (response.success) {
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
          activeWorkspaceId: state.activeWorkspaceId === workspaceId ? null : state.activeWorkspaceId,
          isLoading: false,
        }));
        return true;
      } else {
        set({ error: response.error || 'Error al eliminar', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al eliminar', isLoading: false });
      return false;
    }
  },

  // ============================================================================
  // Members Actions
  // ============================================================================

  loadMembers: async (workspaceId: string) => {
    try {
      const response = await workspacesApi.getMembers(workspaceId);

      if (response.success && response.data) {
        set({ members: response.data });
      }
    } catch (err: any) {
      console.error('Error loading members:', err);
    }
  },

  addMember: async (workspaceId, userId, role = 'operator') => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.addMember(workspaceId, userId, role);

      if (response.success && response.data) {
        set((state) => ({
          members: [...state.members, response.data!],
          isLoading: false,
        }));
        return true;
      } else {
        set({ error: response.error || 'Error al agregar miembro', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al agregar miembro', isLoading: false });
      return false;
    }
  },

  updateMember: async (workspaceId, userId, data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.updateMember(workspaceId, userId, data);

      if (response.success && response.data) {
        set((state) => ({
          members: state.members.map((m) =>
            m.userId === userId ? response.data! : m
          ),
          isLoading: false,
        }));
        return true;
      } else {
        set({ error: response.error || 'Error al actualizar miembro', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al actualizar miembro', isLoading: false });
      return false;
    }
  },

  removeMember: async (workspaceId, userId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.removeMember(workspaceId, userId);

      if (response.success) {
        set((state) => ({
          members: state.members.filter((m) => m.userId !== userId),
          isLoading: false,
        }));
        return true;
      } else {
        set({ error: response.error || 'Error al remover miembro', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al remover miembro', isLoading: false });
      return false;
    }
  },

  // ============================================================================
  // Invitations Actions
  // ============================================================================

  loadInvitations: async (workspaceId: string) => {
    try {
      const response = await workspacesApi.getInvitations(workspaceId);

      if (response.success && response.data) {
        set({ invitations: response.data });
      }
    } catch (err: any) {
      console.error('Error loading invitations:', err);
    }
  },

  createInvitation: async (workspaceId, email, role) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.createInvitation(workspaceId, { email, role });

      if (response.success && response.data) {
        set((state) => ({
          invitations: [...state.invitations, response.data!],
          isLoading: false,
        }));
        return true;
      } else {
        set({ error: response.error || 'Error al crear invitación', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al crear invitación', isLoading: false });
      return false;
    }
  },

  cancelInvitation: async (workspaceId, invitationId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.cancelInvitation(workspaceId, invitationId);

      if (response.success) {
        set((state) => ({
          invitations: state.invitations.filter((i) => i.id !== invitationId),
          isLoading: false,
        }));
        return true;
      } else {
        set({ error: response.error || 'Error al cancelar invitación', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al cancelar invitación', isLoading: false });
      return false;
    }
  },

  acceptInvitation: async (token) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesApi.acceptInvitation(token);

      if (response.success) {
        // Reload workspaces to include the new one
        await get().loadWorkspaces();
        // Remove from pending
        set((state) => ({
          pendingInvitations: state.pendingInvitations.filter((i) => i.token !== token),
          isLoading: false,
        }));
        return true;
      } else {
        set({ error: response.error || 'Error al aceptar invitación', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Error al aceptar invitación', isLoading: false });
      return false;
    }
  },

  loadPendingInvitations: async () => {
    try {
      const response = await workspacesApi.getMyPendingInvitations();

      if (response.success && response.data) {
        set({ pendingInvitations: response.data });
      }
    } catch (err: any) {
      console.error('Error loading pending invitations:', err);
    }
  },

  // ============================================================================
  // Utilities
  // ============================================================================

  clearError: () => set({ error: null }),

  reset: () => set({
    workspaces: [],
    activeWorkspaceId: null,
    members: [],
    invitations: [],
    pendingInvitations: [],
    isLoading: false,
    error: null,
  }),
}));

// ============================================================================
// FC-820: useWorkspaces Hook
// ============================================================================

export function useWorkspaces() {
  const store = useWorkspaceStore();

  const activeWorkspace = store.workspaces.find((w) => w.id === store.activeWorkspaceId) || null;

  return {
    workspaces: store.workspaces,
    activeWorkspace,
    activeWorkspaceId: store.activeWorkspaceId,
    isLoading: store.isLoading,
    error: store.error,
    loadWorkspaces: store.loadWorkspaces,
    setActiveWorkspace: store.setActiveWorkspace,
    createWorkspace: store.createWorkspace,
    updateWorkspace: store.updateWorkspace,
    deleteWorkspace: store.deleteWorkspace,
    clearError: store.clearError,
  };
}

// ============================================================================
// FC-826: useInvitations Hook
// ============================================================================

export function useInvitations(workspaceId?: string) {
  const store = useWorkspaceStore();

  return {
    invitations: store.invitations,
    pendingInvitations: store.pendingInvitations,
    isLoading: store.isLoading,
    error: store.error,
    loadInvitations: workspaceId ? () => store.loadInvitations(workspaceId) : store.loadInvitations,
    createInvitation: workspaceId
      ? (email: string, role: 'admin' | 'operator' | 'viewer') =>
          store.createInvitation(workspaceId, email, role)
      : store.createInvitation,
    cancelInvitation: workspaceId
      ? (invitationId: string) => store.cancelInvitation(workspaceId, invitationId)
      : store.cancelInvitation,
    acceptInvitation: store.acceptInvitation,
    loadPendingInvitations: store.loadPendingInvitations,
    clearError: store.clearError,
  };
}

// ============================================================================
// useMembers Hook
// ============================================================================

export function useMembers(workspaceId?: string) {
  const store = useWorkspaceStore();

  return {
    members: store.members,
    isLoading: store.isLoading,
    error: store.error,
    loadMembers: workspaceId ? () => store.loadMembers(workspaceId) : store.loadMembers,
    addMember: workspaceId
      ? (userId: string, role?: string) => store.addMember(workspaceId, userId, role)
      : store.addMember,
    updateMember: workspaceId
      ? (userId: string, data: { role?: string; permissions?: any }) =>
          store.updateMember(workspaceId, userId, data)
      : store.updateMember,
    removeMember: workspaceId
      ? (userId: string) => store.removeMember(workspaceId, userId)
      : store.removeMember,
    clearError: store.clearError,
  };
}
