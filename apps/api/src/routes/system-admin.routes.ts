/**
 * System Admin Routes
 * 
 * Rutas internas para gestión de administradores del sistema.
 * Solo accesible por super-admins con scope '*'
 */

import { Elysia, t } from 'elysia';
import { systemAdminService } from '../services/system-admin.service';

export const systemAdminRoutes = new Elysia({ prefix: '/internal/system-admins' })
  /**
   * Listar todos los administradores
   */
  .get(
    '/',
    async ({ headers, set }) => {
      const userId = headers['x-user-id'];
      
      if (!userId) {
        set.status = 401;
        return { success: false, error: 'No autenticado' };
      }

      // Solo super-admins pueden listar
      const isSuperAdmin = await systemAdminService.hasScope(userId, '*');
      if (!isSuperAdmin) {
        set.status = 403;
        return { success: false, error: 'Acceso denegado. Se requiere scope: *' };
      }

      try {
        const admins = await systemAdminService.listAdmins();
        return { success: true, data: admins };
      } catch (error) {
        set.status = 500;
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Error al listar administradores' 
        };
      }
    }
  )

  /**
   * Otorgar privilegios de administrador
   */
  .post(
    '/grant',
    async ({ headers, body, set }) => {
      const userId = headers['x-user-id'];
      
      if (!userId) {
        set.status = 401;
        return { success: false, error: 'No autenticado' };
      }

      // Solo super-admins pueden otorgar privilegios
      const isSuperAdmin = await systemAdminService.hasScope(userId, '*');
      if (!isSuperAdmin) {
        set.status = 403;
        return { success: false, error: 'Acceso denegado. Se requiere scope: *' };
      }

      try {
        const admin = await systemAdminService.grantAdmin(
          body.targetUserId,
          body.scopes,
          userId
        );
        return { success: true, data: admin };
      } catch (error) {
        set.status = 500;
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Error al otorgar privilegios' 
        };
      }
    },
    {
      body: t.Object({
        targetUserId: t.String(),
        scopes: t.Object({
          credits: t.Optional(t.Boolean()),
          policies: t.Optional(t.Boolean()),
        }, { additionalProperties: true }),
      }),
    }
  )

  /**
   * Revocar privilegios de administrador
   */
  .delete(
    '/:targetUserId',
    async ({ headers, params, set }) => {
      const userId = headers['x-user-id'];
      
      if (!userId) {
        set.status = 401;
        return { success: false, error: 'No autenticado' };
      }

      // Solo super-admins pueden revocar privilegios
      const isSuperAdmin = await systemAdminService.hasScope(userId, '*');
      if (!isSuperAdmin) {
        set.status = 403;
        return { success: false, error: 'Acceso denegado. Se requiere scope: *' };
      }

      // No permitir auto-revocación
      if (userId === params.targetUserId) {
        set.status = 400;
        return { success: false, error: 'No puedes revocar tus propios privilegios' };
      }

      try {
        const revoked = await systemAdminService.revokeAdmin(params.targetUserId);
        if (!revoked) {
          set.status = 404;
          return { success: false, error: 'Usuario no encontrado o no es administrador' };
        }
        return { success: true, message: 'Privilegios revocados' };
      } catch (error) {
        set.status = 500;
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Error al revocar privilegios' 
        };
      }
    }
  )

  /**
   * Actualizar scopes de un administrador
   */
  .patch(
    '/:targetUserId/scopes',
    async ({ headers, params, body, set }) => {
      const userId = headers['x-user-id'];
      
      if (!userId) {
        set.status = 401;
        return { success: false, error: 'No autenticado' };
      }

      // Solo super-admins pueden actualizar scopes
      const isSuperAdmin = await systemAdminService.hasScope(userId, '*');
      if (!isSuperAdmin) {
        set.status = 403;
        return { success: false, error: 'Acceso denegado. Se requiere scope: *' };
      }

      try {
        const admin = await systemAdminService.updateScopes(params.targetUserId, body.scopes);
        return { success: true, data: admin };
      } catch (error) {
        set.status = 500;
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Error al actualizar scopes' 
        };
      }
    },
    {
      body: t.Object({
        scopes: t.Object({
          credits: t.Optional(t.Boolean()),
          policies: t.Optional(t.Boolean()),
        }, { additionalProperties: true }),
      }),
    }
  );
