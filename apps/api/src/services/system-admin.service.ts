import { db, systemAdmins, accounts, type SystemAdmin, type SystemAdminScopes } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

type ScopeKey = keyof SystemAdminScopes | string;

class SystemAdminService {
  async findByUserId(userId: string): Promise<SystemAdmin | null> {
    const [admin] = await db.select().from(systemAdmins).where(eq(systemAdmins.userId, userId)).limit(1);
    return admin || null;
  }

  async getScopes(userId: string | undefined): Promise<SystemAdminScopes | null> {
    if (!userId) return null;
    const admin = await this.findByUserId(userId);
    if (!admin || !admin.scopes) return null;
    return admin.scopes;
  }

  async hasScope(userId: string | undefined, scope: ScopeKey = 'credits'): Promise<boolean> {
    if (!userId) return false;
    const scopes = await this.getScopes(userId);
    if (!scopes) return false;
    const flag = scopes[scope];
    if (typeof flag === 'boolean') {
      return flag;
    }
    // Allow wildcard scope
    if (scope !== '*') {
      return scopes['*'] === true;
    }
    return false;
  }

  /**
   * Otorgar privilegios de administrador a un usuario
   */
  async grantAdmin(userId: string, scopes: SystemAdminScopes, createdBy?: string): Promise<SystemAdmin> {
    // Verificar que el usuario existe
    const [user] = await db.select().from(accounts).where(eq(accounts.id, userId)).limit(1);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si ya es admin
    const existing = await this.findByUserId(userId);
    if (existing) {
      // Actualizar scopes existentes
      const [updated] = await db
        .update(systemAdmins)
        .set({ scopes })
        .where(eq(systemAdmins.userId, userId))
        .returning();
      return updated;
    }

    // Crear nuevo admin
    const [admin] = await db.insert(systemAdmins).values({
      userId,
      scopes,
      createdBy: createdBy || null,
    }).returning();
    
    return admin;
  }

  /**
   * Revocar privilegios de administrador a un usuario
   */
  async revokeAdmin(userId: string): Promise<boolean> {
    const result = await db.delete(systemAdmins).where(eq(systemAdmins.userId, userId)).returning();
    return result.length > 0;
  }

  /**
   * Listar todos los administradores
   */
  async listAdmins(): Promise<Array<SystemAdmin & { username?: string | null; displayName?: string | null }>> {
    const admins = await db
      .select({
        userId: systemAdmins.userId,
        scopes: systemAdmins.scopes,
        createdBy: systemAdmins.createdBy,
        createdAt: systemAdmins.createdAt,
        username: accounts.username,
        displayName: accounts.displayName,
      })
      .from(systemAdmins)
      .leftJoin(accounts, eq(systemAdmins.userId, accounts.id));
    
    return admins;
  }

  /**
   * Actualizar scopes de un administrador existente
   */
  async updateScopes(userId: string, scopes: SystemAdminScopes): Promise<SystemAdmin> {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      throw new Error('El usuario no es administrador');
    }

    const [updated] = await db
      .update(systemAdmins)
      .set({ scopes })
      .where(eq(systemAdmins.userId, userId))
      .returning();
    
    return updated;
  }
}

export const systemAdminService = new SystemAdminService();
