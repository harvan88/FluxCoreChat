/**
 * Extension Service
 * FC-154: Gestión de instalaciones de extensiones
 */

import { db, extensionInstallations, extensionContexts } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export interface InstallExtensionParams {
  accountId: string;
  extensionId: string;
  version: string;
  config?: Record<string, any>;
  grantedPermissions?: string[];
  grantedBy?: string;
  canSharePermissions?: boolean;
}

export interface UpdateExtensionParams {
  enabled?: boolean;
  config?: Record<string, any>;
  grantedPermissions?: string[];
}

class ExtensionService {
  /**
   * Instalar una extensión para una cuenta
   */
  async install(params: InstallExtensionParams) {
    const { 
      accountId, 
      extensionId, 
      version, 
      config = {}, 
      grantedPermissions = [],
      grantedBy,
      canSharePermissions = true,
    } = params;

    // Verificar si ya está instalada
    const existing = await db
      .select()
      .from(extensionInstallations)
      .where(
        and(
          eq(extensionInstallations.accountId, accountId),
          eq(extensionInstallations.extensionId, extensionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Extension ${extensionId} is already installed for this account`);
    }

    // Crear instalación con permisos auto-concedidos al propietario
    const [installation] = await db
      .insert(extensionInstallations)
      .values({
        accountId,
        extensionId,
        version,
        enabled: true,
        config,
        grantedPermissions,
        grantedBy: grantedBy || null, // null = auto-concedido (propietario)
        canSharePermissions,
        permissionsGrantedAt: new Date(),
      })
      .returning();

    return installation;
  }

  /**
   * Desinstalar una extensión
   */
  async uninstall(accountId: string, extensionId: string) {
    // Eliminar contextos de la extensión
    await db
      .delete(extensionContexts)
      .where(
        and(
          eq(extensionContexts.extensionId, extensionId),
          eq(extensionContexts.accountId, accountId)
        )
      );

    // Eliminar instalación
    const [deleted] = await db
      .delete(extensionInstallations)
      .where(
        and(
          eq(extensionInstallations.accountId, accountId),
          eq(extensionInstallations.extensionId, extensionId)
        )
      )
      .returning();

    return deleted;
  }

  /**
   * Obtener todas las extensiones instaladas para una cuenta
   */
  async getInstalled(accountId: string) {
    return db
      .select()
      .from(extensionInstallations)
      .where(eq(extensionInstallations.accountId, accountId));
  }

  /**
   * Obtener una instalación específica
   */
  async getInstallation(accountId: string, extensionId: string) {
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

    return installation || null;
  }

  /**
   * Actualizar configuración de una extensión
   */
  async update(accountId: string, extensionId: string, params: UpdateExtensionParams) {
    const updates: any = { updatedAt: new Date() };

    if (params.enabled !== undefined) {
      updates.enabled = params.enabled;
    }
    if (params.config !== undefined) {
      updates.config = params.config;
    }
    if (params.grantedPermissions !== undefined) {
      updates.grantedPermissions = params.grantedPermissions;
    }

    const [updated] = await db
      .update(extensionInstallations)
      .set(updates)
      .where(
        and(
          eq(extensionInstallations.accountId, accountId),
          eq(extensionInstallations.extensionId, extensionId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Habilitar/deshabilitar una extensión
   */
  async setEnabled(accountId: string, extensionId: string, enabled: boolean) {
    return this.update(accountId, extensionId, { enabled });
  }
}

export const extensionService = new ExtensionService();
