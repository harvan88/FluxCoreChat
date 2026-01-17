/**
 * Extension Permissions Service
 * Gestión de permisos granulares para extensiones
 * 
 * Principios TOTEM:
 * - Propietario auto-recibe todos los permisos al instalar
 * - Colaboradores requieren permisos delegados
 * - Permisos son heredables si canSharePermissions=true
 */

import { db, extensionInstallations, workspaceMembers } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export interface GrantPermissionsParams {
  accountId: string;
  extensionId: string;
  permissions: string[];
  grantedBy: string;
  canShare?: boolean;
}

export interface RevokePermissionsParams {
  accountId: string;
  extensionId: string;
  permissions: string[];
}

class ExtensionPermissionsService {
  /**
   * Verificar si una cuenta es propietaria de otra (workspace)
   */
  async isOwnerOf(ownerAccountId: string, targetAccountId: string): Promise<boolean> {
    if (ownerAccountId === targetAccountId) return true;
    
    // Verificar en workspace_members
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, targetAccountId),
          eq(workspaceMembers.role, 'owner')
        )
      )
      .limit(1);
    
    return !!membership;
  }

  /**
   * Verificar si una cuenta puede otorgar permisos de una extensión
   */
  async canGrantPermissions(
    granterAccountId: string, 
    extensionId: string
  ): Promise<{ canGrant: boolean; availablePermissions: string[] }> {
    const [installation] = await db
      .select()
      .from(extensionInstallations)
      .where(
        and(
          eq(extensionInstallations.accountId, granterAccountId),
          eq(extensionInstallations.extensionId, extensionId)
        )
      )
      .limit(1);

    if (!installation) {
      return { canGrant: false, availablePermissions: [] };
    }

    // Si no puede compartir permisos
    if (!installation.canSharePermissions) {
      return { canGrant: false, availablePermissions: [] };
    }

    return {
      canGrant: true,
      availablePermissions: (installation.grantedPermissions as string[]) || [],
    };
  }

  /**
   * Otorgar permisos a una cuenta para una extensión
   * Solo el propietario o quien tenga canSharePermissions=true puede otorgar
   */
  async grantPermissions(params: GrantPermissionsParams): Promise<any> {
    const { accountId, extensionId, permissions, grantedBy, canShare = false } = params;

    // Verificar que quien otorga puede hacerlo
    const { canGrant, availablePermissions } = await this.canGrantPermissions(grantedBy, extensionId);
    
    // Si es auto-concesión (mismo account), siempre permitir
    const isSelfGrant = accountId === grantedBy;
    
    if (!isSelfGrant && !canGrant) {
      throw new Error('No tiene permisos para otorgar permisos de esta extensión');
    }

    // Validar que solo se otorgan permisos disponibles
    if (!isSelfGrant) {
      const invalidPerms = permissions.filter(p => !availablePermissions.includes(p));
      if (invalidPerms.length > 0) {
        throw new Error(`Permisos no disponibles: ${invalidPerms.join(', ')}`);
      }
    }

    // Verificar si ya existe instalación
    const [existing] = await db
      .select()
      .from(extensionInstallations)
      .where(
        and(
          eq(extensionInstallations.accountId, accountId),
          eq(extensionInstallations.extensionId, extensionId)
        )
      )
      .limit(1);

    if (existing) {
      // Actualizar permisos existentes
      const currentPerms = (existing.grantedPermissions as string[]) || [];
      const newPerms = [...new Set([...currentPerms, ...permissions])];

      const [updated] = await db
        .update(extensionInstallations)
        .set({
          grantedPermissions: newPerms,
          grantedBy: isSelfGrant ? null : grantedBy,
          canSharePermissions: canShare,
          permissionsGrantedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(extensionInstallations.id, existing.id))
        .returning();

      return updated;
    }

    throw new Error('Extension not installed for this account');
  }

  /**
   * Revocar permisos de una cuenta
   */
  async revokePermissions(params: RevokePermissionsParams): Promise<any> {
    const { accountId, extensionId, permissions } = params;

    const [existing] = await db
      .select()
      .from(extensionInstallations)
      .where(
        and(
          eq(extensionInstallations.accountId, accountId),
          eq(extensionInstallations.extensionId, extensionId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error('Extension installation not found');
    }

    const currentPerms = (existing.grantedPermissions as string[]) || [];
    const newPerms = currentPerms.filter(p => !permissions.includes(p));

    const [updated] = await db
      .update(extensionInstallations)
      .set({
        grantedPermissions: newPerms,
        updatedAt: new Date(),
      })
      .where(eq(extensionInstallations.id, existing.id))
      .returning();

    return updated;
  }

  /**
   * Obtener permisos de una cuenta para una extensión
   */
  async getPermissions(accountId: string, extensionId: string): Promise<{
    permissions: string[];
    canShare: boolean;
    grantedBy: string | null;
  } | null> {
    const [installation] = await db
      .select()
      .from(extensionInstallations)
      .where(
        and(
          eq(extensionInstallations.accountId, accountId),
          eq(extensionInstallations.extensionId, extensionId)
        )
      )
      .limit(1);

    if (!installation) return null;

    return {
      permissions: (installation.grantedPermissions as string[]) || [],
      canShare: installation.canSharePermissions ?? false,
      grantedBy: installation.grantedBy,
    };
  }

  /**
   * Verificar si una cuenta tiene un permiso específico
   */
  async hasPermission(
    accountId: string, 
    extensionId: string, 
    permission: string
  ): Promise<boolean> {
    const perms = await this.getPermissions(accountId, extensionId);
    if (!perms) return false;
    return perms.permissions.includes(permission);
  }

  /**
   * Auto-conceder todos los permisos al propietario durante instalación
   */
  async autoGrantOwnerPermissions(
    accountId: string,
    extensionId: string,
    manifestPermissions: string[]
  ): Promise<any> {
    return this.grantPermissions({
      accountId,
      extensionId,
      permissions: manifestPermissions,
      grantedBy: accountId,
      canShare: true, // Propietario siempre puede compartir
    });
  }
}

export const extensionPermissionsService = new ExtensionPermissionsService();
