/**
 * Workspaces Routes - API para gestión de workspaces colaborativos
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { getWorkspaceService } from '../services/workspace.service';

const workspaceService = getWorkspaceService();

export const workspacesRoutes = new Elysia({ prefix: '/workspaces' })
  .use(authMiddleware)

  // GET /workspaces - Listar workspaces del usuario
  .get('/', async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const workspaces = await workspaceService.getUserWorkspaces(user.id);
      return {
        success: true,
        data: workspaces,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  })

  // POST /workspaces - Crear workspace
  .post('/', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { accountId, name, description } = body as any;

      if (!accountId || !name) {
        set.status = 400;
        return { success: false, message: 'accountId and name are required' };
      }

      const workspace = await workspaceService.createWorkspace(
        accountId,
        user.id,
        { name, description }
      );

      return {
        success: true,
        data: workspace,
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      name: t.String(),
      description: t.Optional(t.String()),
    }),
  })

  // GET /workspaces/:id - Obtener workspace
  .get('/:id', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const workspace = await workspaceService.getWorkspaceById(params.id);

      if (!workspace) {
        set.status = 404;
        return { success: false, message: 'Workspace not found' };
      }

      // Verificar que el usuario es miembro
      const member = await workspaceService.getMember(params.id, user.id);
      if (!member) {
        set.status = 403;
        return { success: false, message: 'Not a member of this workspace' };
      }

      return {
        success: true,
        data: {
          ...workspace,
          role: member.role,
          permissions: member.permissions,
        },
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // PATCH /workspaces/:id - Actualizar workspace
  .patch('/:id', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      // Verificar permisos
      const canManage = await workspaceService.canManage(params.id, user.id);
      if (!canManage) {
        set.status = 403;
        return { success: false, message: 'Permission denied' };
      }

      const { name, description, settings } = body as any;
      const workspace = await workspaceService.updateWorkspace(params.id, {
        name,
        description,
        settings,
      });

      return {
        success: true,
        data: workspace,
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      settings: t.Optional(t.Any()),
    }),
  })

  // DELETE /workspaces/:id - Eliminar workspace
  .delete('/:id', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const member = await workspaceService.getMember(params.id, user.id);
      if (!member || member.role !== 'owner') {
        set.status = 403;
        return { success: false, message: 'Only owner can delete workspace' };
      }

      await workspaceService.deleteWorkspace(params.id);

      return {
        success: true,
        message: 'Workspace deleted',
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // ============ MIEMBROS ============

  // GET /workspaces/:id/members - Listar miembros
  .get('/:id/members', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const member = await workspaceService.getMember(params.id, user.id);
      if (!member) {
        set.status = 403;
        return { success: false, message: 'Not a member of this workspace' };
      }

      const members = await workspaceService.getMembers(params.id);

      return {
        success: true,
        data: members,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // POST /workspaces/:id/members - Agregar miembro directamente (por userId)
  .post('/:id/members', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const canManage = await workspaceService.canManage(params.id, user.id);
      if (!canManage) {
        set.status = 403;
        return { success: false, message: 'Permission denied' };
      }

      const { userId, role } = body as any;
      const member = await workspaceService.addMember(
        params.id,
        userId,
        role || 'operator',
        user.id
      );

      return {
        success: true,
        data: member,
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      userId: t.String(),
      role: t.Optional(t.String()),
    }),
  })

  // PATCH /workspaces/:id/members/:userId - Actualizar miembro
  .patch('/:id/members/:userId', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const canManage = await workspaceService.canManage(params.id, user.id);
      if (!canManage) {
        set.status = 403;
        return { success: false, message: 'Permission denied' };
      }

      const { role, permissions } = body as any;
      let member;

      if (role) {
        member = await workspaceService.updateMemberRole(
          params.id,
          params.userId,
          role
        );
      }

      if (permissions) {
        member = await workspaceService.updateMemberPermissions(
          params.id,
          params.userId,
          permissions
        );
      }

      return {
        success: true,
        data: member,
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
      userId: t.String(),
    }),
    body: t.Object({
      role: t.Optional(t.String()),
      permissions: t.Optional(t.Any()),
    }),
  })

  // DELETE /workspaces/:id/members/:userId - Remover miembro
  .delete('/:id/members/:userId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const canManage = await workspaceService.canManage(params.id, user.id);
      if (!canManage) {
        set.status = 403;
        return { success: false, message: 'Permission denied' };
      }

      await workspaceService.removeMember(params.id, params.userId);

      return {
        success: true,
        message: 'Member removed',
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
      userId: t.String(),
    }),
  })

  // ============ INVITACIONES ============

  // GET /workspaces/:id/invitations - Listar invitaciones pendientes
  .get('/:id/invitations', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const canManage = await workspaceService.canManage(params.id, user.id);
      if (!canManage) {
        set.status = 403;
        return { success: false, message: 'Permission denied' };
      }

      const invitations = await workspaceService.getPendingInvitations(params.id);

      return {
        success: true,
        data: invitations,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // POST /workspaces/:id/invitations - Crear invitación
  .post('/:id/invitations', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const canManage = await workspaceService.canManage(params.id, user.id);
      if (!canManage) {
        set.status = 403;
        return { success: false, message: 'Permission denied' };
      }

      const { email, role } = body as any;
      const invitation = await workspaceService.createInvitation(
        params.id,
        email,
        role || 'operator',
        user.id
      );

      return {
        success: true,
        data: invitation,
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      email: t.String(),
      role: t.Optional(t.String()),
    }),
  })

  // DELETE /workspaces/:id/invitations/:invitationId - Cancelar invitación
  .delete('/:id/invitations/:invitationId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const canManage = await workspaceService.canManage(params.id, user.id);
      if (!canManage) {
        set.status = 403;
        return { success: false, message: 'Permission denied' };
      }

      await workspaceService.cancelInvitation(params.invitationId);

      return {
        success: true,
        message: 'Invitation cancelled',
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      id: t.String(),
      invitationId: t.String(),
    }),
  })

  // POST /workspaces/invitations/:token/accept - Aceptar invitación
  .post('/invitations/:token/accept', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const member = await workspaceService.acceptInvitation(params.token, user.id);

      return {
        success: true,
        data: member,
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      token: t.String(),
    }),
  })

  // GET /workspaces/invitations/pending - Obtener invitaciones pendientes del usuario (FC-531)
  .get('/invitations/pending', async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const invitations = await workspaceService.getPendingInvitationsByEmail(user.email);

      return {
        success: true,
        data: invitations,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  });

export default workspacesRoutes;
