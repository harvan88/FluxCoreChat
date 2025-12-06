/**
 * Permission Validator Service
 * FC-156: Validación de permisos de extensiones
 */

import type { ContextPermission } from '@fluxcore/types';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

class PermissionValidatorService {
  /**
   * Verificar si una extensión tiene un permiso específico
   */
  hasPermission(
    grantedPermissions: string[],
    requiredPermission: ContextPermission
  ): PermissionCheckResult {
    if (grantedPermissions.includes(requiredPermission)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Missing permission: ${requiredPermission}`,
    };
  }

  /**
   * Verificar múltiples permisos
   */
  hasAllPermissions(
    grantedPermissions: string[],
    requiredPermissions: ContextPermission[]
  ): PermissionCheckResult {
    for (const perm of requiredPermissions) {
      const check = this.hasPermission(grantedPermissions, perm);
      if (!check.allowed) {
        return check;
      }
    }
    return { allowed: true };
  }

  /**
   * Verificar si tiene al menos uno de los permisos
   */
  hasAnyPermission(
    grantedPermissions: string[],
    anyOfPermissions: ContextPermission[]
  ): PermissionCheckResult {
    for (const perm of anyOfPermissions) {
      if (grantedPermissions.includes(perm)) {
        return { allowed: true };
      }
    }
    return {
      allowed: false,
      reason: `Requires one of: ${anyOfPermissions.join(', ')}`,
    };
  }

  /**
   * Verificar permiso de lectura de contexto
   */
  canReadContext(
    grantedPermissions: string[],
    contextType: 'public' | 'private' | 'relationship' | 'history' | 'overlay'
  ): PermissionCheckResult {
    const permissionMap: Record<string, ContextPermission> = {
      public: 'read:context.public',
      private: 'read:context.private',
      relationship: 'read:context.relationship',
      history: 'read:context.history',
      overlay: 'read:context.overlay',
    };

    return this.hasPermission(grantedPermissions, permissionMap[contextType]);
  }

  /**
   * Verificar permiso de escritura de contexto
   */
  canWriteContext(
    grantedPermissions: string[],
    contextType: 'overlay'
  ): PermissionCheckResult {
    if (contextType === 'overlay') {
      return this.hasPermission(grantedPermissions, 'write:context.overlay');
    }
    return { allowed: false, reason: 'Invalid context type for writing' };
  }

  /**
   * Verificar permiso de envío de mensajes
   */
  canSendMessages(grantedPermissions: string[]): PermissionCheckResult {
    return this.hasPermission(grantedPermissions, 'send:messages');
  }

  /**
   * Verificar permiso de modificar automatización
   */
  canModifyAutomation(grantedPermissions: string[]): PermissionCheckResult {
    return this.hasPermission(grantedPermissions, 'modify:automation');
  }

  /**
   * Filtrar permisos inválidos de una lista
   */
  filterValidPermissions(permissions: string[]): ContextPermission[] {
    const validPermissions: ContextPermission[] = [
      'read:context.public',
      'read:context.private',
      'read:context.relationship',
      'read:context.history',
      'read:context.overlay',
      'write:context.overlay',
      'send:messages',
      'modify:automation',
      'read:messages',
      'write:enrichments',
      'tools:register',
    ];

    return permissions.filter((p) =>
      validPermissions.includes(p as ContextPermission)
    ) as ContextPermission[];
  }
}

export const permissionValidator = new PermissionValidatorService();
