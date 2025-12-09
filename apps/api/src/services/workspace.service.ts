/**
 * Workspace Service
 * 
 * Gestión de workspaces colaborativos para cuentas de negocio.
 */

import { db } from '@fluxcore/db';
import { accounts, users } from '@fluxcore/db';
import { 
  workspaces, 
  workspaceMembers, 
  workspaceInvitations,
  DEFAULT_PERMISSIONS,
  type WorkspaceRole,
  type WorkspacePermissions,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceInvitation
} from '../../../../packages/db/src/schema/workspaces';
import { eq, and } from 'drizzle-orm';

export class WorkspaceService {
  /**
   * Crear un workspace para una cuenta de negocio
   */
  async createWorkspace(
    ownerAccountId: string, 
    ownerUserId: string,
    data: { name: string; description?: string }
  ): Promise<Workspace> {
    // Verificar que la cuenta existe y es de tipo business
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, ownerAccountId))
      .limit(1);

    if (!account) {
      throw new Error('Account not found');
    }

    // Crear workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        ownerAccountId,
        name: data.name,
        description: data.description,
        settings: {},
      })
      .returning();

    // Agregar al owner como miembro con rol 'owner'
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: ownerUserId,
      role: 'owner',
      permissions: DEFAULT_PERMISSIONS.owner,
      joinedAt: new Date(),
    });

    return workspace;
  }

  /**
   * Obtener workspace por ID
   */
  async getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    return workspace || null;
  }

  /**
   * Obtener workspaces de un usuario
   */
  async getUserWorkspaces(userId: string): Promise<(Workspace & { role: WorkspaceRole })[]> {
    const memberships = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));

    return memberships.map(m => ({
      ...m.workspace,
      role: m.role as WorkspaceRole,
    }));
  }

  /**
   * Obtener workspaces de una cuenta
   */
  async getAccountWorkspace(accountId: string): Promise<Workspace | null> {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerAccountId, accountId))
      .limit(1);

    return workspace || null;
  }

  /**
   * Actualizar workspace
   */
  async updateWorkspace(
    workspaceId: string,
    data: { name?: string; description?: string; settings?: any }
  ): Promise<Workspace> {
    const [workspace] = await db
      .update(workspaces)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    return workspace;
  }

  /**
   * Eliminar workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  }

  // ============ MIEMBROS ============

  /**
   * Obtener miembros de un workspace
   */
  async getMembers(workspaceId: string): Promise<(WorkspaceMember & { user: { id: string; name: string; email: string } })[]> {
    const members = await db
      .select({
        member: workspaceMembers,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    return members.map(m => ({
      ...m.member,
      user: m.user,
    }));
  }

  /**
   * Obtener miembro específico
   */
  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    return member || null;
  }

  /**
   * Agregar miembro a workspace
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    invitedBy?: string
  ): Promise<WorkspaceMember> {
    // Verificar que no exista
    const existing = await this.getMember(workspaceId, userId);
    if (existing) {
      throw new Error('User is already a member of this workspace');
    }

    const [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId,
        role,
        permissions: DEFAULT_PERMISSIONS[role],
        invitedBy,
        invitedAt: invitedBy ? new Date() : null,
        joinedAt: new Date(),
      })
      .returning();

    return member;
  }

  /**
   * Actualizar rol de miembro
   */
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<WorkspaceMember> {
    // No se puede cambiar el rol del owner
    const member = await this.getMember(workspaceId, userId);
    if (!member) {
      throw new Error('Member not found');
    }
    if (member.role === 'owner') {
      throw new Error('Cannot change role of workspace owner');
    }

    const [updated] = await db
      .update(workspaceMembers)
      .set({
        role,
        permissions: DEFAULT_PERMISSIONS[role],
      })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Actualizar permisos específicos de miembro
   */
  async updateMemberPermissions(
    workspaceId: string,
    userId: string,
    permissions: Partial<WorkspacePermissions>
  ): Promise<WorkspaceMember> {
    const member = await this.getMember(workspaceId, userId);
    if (!member) {
      throw new Error('Member not found');
    }

    const currentPermissions = member.permissions as WorkspacePermissions;
    const newPermissions = { ...currentPermissions, ...permissions };

    const [updated] = await db
      .update(workspaceMembers)
      .set({ permissions: newPermissions })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Remover miembro de workspace
   */
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const member = await this.getMember(workspaceId, userId);
    if (!member) {
      throw new Error('Member not found');
    }
    if (member.role === 'owner') {
      throw new Error('Cannot remove workspace owner');
    }

    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      );
  }

  // ============ INVITACIONES ============

  /**
   * Crear invitación
   */
  async createInvitation(
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    invitedBy: string
  ): Promise<WorkspaceInvitation> {
    // No se puede invitar como owner
    if (role === 'owner') {
      throw new Error('Cannot invite as owner');
    }

    // Verificar si ya existe una invitación pendiente
    const [existing] = await db
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.workspaceId, workspaceId),
          eq(workspaceInvitations.email, email)
        )
      )
      .limit(1);

    if (existing && !existing.acceptedAt) {
      throw new Error('Invitation already sent to this email');
    }

    // Generar token único
    const token = crypto.randomUUID().replace(/-/g, '');

    // Crear invitación (expira en 7 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invitation] = await db
      .insert(workspaceInvitations)
      .values({
        workspaceId,
        email,
        role,
        token,
        invitedBy,
        expiresAt,
      })
      .returning();

    return invitation;
  }

  /**
   * Obtener invitación por token
   */
  async getInvitationByToken(token: string): Promise<WorkspaceInvitation | null> {
    const [invitation] = await db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.token, token))
      .limit(1);

    return invitation || null;
  }

  /**
   * Aceptar invitación
   */
  async acceptInvitation(token: string, userId: string): Promise<WorkspaceMember> {
    const invitation = await this.getInvitationByToken(token);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new Error('Invitation already accepted');
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error('Invitation has expired');
    }

    // Marcar invitación como aceptada
    await db
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitation.id));

    // Agregar miembro
    return this.addMember(
      invitation.workspaceId,
      userId,
      invitation.role as WorkspaceRole,
      invitation.invitedBy
    );
  }

  /**
   * Cancelar invitación
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    await db
      .delete(workspaceInvitations)
      .where(eq(workspaceInvitations.id, invitationId));
  }

  /**
   * Obtener invitaciones pendientes de un workspace
   */
  async getPendingInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    return db
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.workspaceId, workspaceId),
          eq(workspaceInvitations.acceptedAt, null as any)
        )
      );
  }

  /**
   * FC-531: Obtener invitaciones pendientes por email del usuario
   */
  async getPendingInvitationsByEmail(email: string): Promise<WorkspaceInvitation[]> {
    return db
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.email, email),
          eq(workspaceInvitations.acceptedAt, null as any)
        )
      );
  }

  // ============ PERMISOS ============

  /**
   * Verificar si usuario tiene permiso
   */
  async hasPermission(
    workspaceId: string,
    userId: string,
    permission: keyof WorkspacePermissions
  ): Promise<boolean> {
    const member = await this.getMember(workspaceId, userId);
    if (!member) return false;

    const permissions = member.permissions as WorkspacePermissions;
    return permissions[permission] === true;
  }

  /**
   * Verificar si usuario puede gestionar workspace
   */
  async canManage(workspaceId: string, userId: string): Promise<boolean> {
    const member = await this.getMember(workspaceId, userId);
    if (!member) return false;
    return member.role === 'owner' || member.role === 'admin';
  }
}

// Singleton
let serviceInstance: WorkspaceService | null = null;

export function getWorkspaceService(): WorkspaceService {
  if (!serviceInstance) {
    serviceInstance = new WorkspaceService();
  }
  return serviceInstance;
}

export default WorkspaceService;
