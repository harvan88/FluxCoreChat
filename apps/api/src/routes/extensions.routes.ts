/**
 * Extension Routes
 * FC-158-166: API endpoints para gestión de extensiones
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { extensionService } from '../services/extension.service';
import { extensionHost } from '../services/extension-host.service';
import { manifestLoader } from '../services/manifest-loader.service';
import { extensionPermissionsService } from '../services/extension-permissions.service';
import { accountService } from '../services/account.service';

export const extensionRoutes = new Elysia({ prefix: '/extensions' })
  .use(authMiddleware)

  // GET /extensions - Listar extensiones disponibles
  .get('/', async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const available = extensionHost.getAvailableExtensions();
      return {
        success: true,
        data: available,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  })

  // GET /extensions/installed - Listar extensiones instaladas para una cuenta
  .get('/installed/:accountId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const installations = await extensionService.getInstalled(params.accountId);
      
      // Enriquecer con información del manifest
      const enriched = installations.map((inst: any) => ({
        ...inst,
        manifest: manifestLoader.getManifest(inst.extensionId),
      }));

      return {
        success: true,
        data: enriched,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
  })

  // POST /extensions/install - Instalar una extensión
  .post('/install', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { accountId, extensionId, grantPermissions } = body as any;

      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      // Verificar que la extensión existe
      const manifest = manifestLoader.getManifest(extensionId);
      if (!manifest) {
        set.status = 404;
        return { success: false, message: `Extension ${extensionId} not found` };
      }

      // Verificar si ya está instalada ANTES de intentar instalar
      const existingInstallations = await extensionService.getInstalled(accountId);
      const alreadyInstalled = existingInstallations.find(
        (inst: any) => inst.extensionId === extensionId
      );
      
      if (alreadyInstalled) {
        // Devolver la instalación existente en lugar de error
        return {
          success: true,
          data: alreadyInstalled,
          message: 'Extension already installed',
          alreadyInstalled: true,
        };
      }

      // Obtener configuración por defecto
      const defaultConfig = manifestLoader.getDefaultConfig(extensionId);

      // Instalar con auto-concesión de permisos al propietario
      // El propietario siempre recibe todos los permisos del manifest
      const installation = await extensionService.install({
        accountId,
        extensionId,
        version: manifest.version,
        config: defaultConfig,
        grantedPermissions: grantPermissions || manifest.permissions,
        grantedBy: undefined, // null = auto-concedido (propietario)
        canSharePermissions: true, // Propietario puede compartir permisos
      });

      await extensionHost.onInstall(accountId, extensionId);
      await extensionHost.onConfigUpdate(accountId, extensionId, (installation as any).config || defaultConfig);
      await extensionHost.onEnable(accountId, extensionId);

      return {
        success: true,
        data: installation,
      };
    } catch (error: any) {
      // Manejar error de constraint único (por si acaso)
      if (error.message.includes('already installed') || error.code === '23505') {
        set.status = 409;
        return { 
          success: false, 
          message: 'Extension already installed for this account',
          code: 'ALREADY_INSTALLED',
        };
      }
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
      grantPermissions: t.Optional(t.Array(t.String())),
    }),
  })

  // DELETE /extensions/:accountId/:extensionId - Desinstalar extensión
  .delete('/:accountId/:extensionId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const extensionId = decodeURIComponent(params.extensionId);

      await extensionHost.onUninstall(params.accountId, extensionId);

      const deleted = await extensionService.uninstall(params.accountId, extensionId);
      
      if (!deleted) {
        set.status = 404;
        return { success: false, message: 'Extension installation not found' };
      }

      return {
        success: true,
        data: deleted,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
    }),
  })

  // PATCH /extensions/:accountId/:extensionId - Actualizar configuración
  .patch('/:accountId/:extensionId', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const { config, enabled } = body as any;

      const extensionId = decodeURIComponent(params.extensionId);

      // Validar configuración si se proporciona
      if (config) {
        const validation = extensionHost.validateConfig(extensionId, config);
        if (!validation.valid) {
          set.status = 400;
          return { success: false, message: validation.errors.join(', ') };
        }
      }

      const updated = await extensionService.update(params.accountId, extensionId, {
        config,
        enabled,
      });

      if (updated) {
        if (config) {
          await extensionHost.onConfigUpdate(params.accountId, extensionId, (updated as any).config || config);
        }
        if (enabled === true) {
          await extensionHost.onEnable(params.accountId, extensionId);
        }
        if (enabled === false) {
          await extensionHost.onDisable(params.accountId, extensionId);
        }
      }

      if (!updated) {
        set.status = 404;
        return { success: false, message: 'Extension installation not found' };
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
    }),
    body: t.Object({
      config: t.Optional(t.Record(t.String(), t.Any())),
      enabled: t.Optional(t.Boolean()),
    }),
  })

  // POST /extensions/:accountId/:extensionId/enable - Habilitar extensión
  .post('/:accountId/:extensionId/enable', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const extensionId = decodeURIComponent(params.extensionId);
      const updated = await extensionService.setEnabled(params.accountId, extensionId, true);
      await extensionHost.onEnable(params.accountId, extensionId);
      return { success: true, data: updated };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
    }),
  })

  // POST /extensions/:accountId/:extensionId/disable - Deshabilitar extensión
  .post('/:accountId/:extensionId/disable', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const extensionId = decodeURIComponent(params.extensionId);
      const updated = await extensionService.setEnabled(params.accountId, extensionId, false);
      await extensionHost.onDisable(params.accountId, extensionId);
      return { success: true, data: updated };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
    }),
  })

  // GET /extensions/manifest/:extensionId - Obtener manifest de una extensión
  .get('/manifest/:extensionId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      // Decodificar el ID de la extensión (puede contener @)
      const extensionId = decodeURIComponent(params.extensionId);
      const manifest = manifestLoader.getManifest(extensionId);
      
      if (!manifest) {
        set.status = 404;
        return { success: false, message: `Extension ${extensionId} not found` };
      }

      return {
        success: true,
        data: manifest,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      extensionId: t.String(),
    }),
  })

  // ═══════════════════════════════════════════════════════════════
  // PERMISSIONS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  // GET /extensions/:accountId/:extensionId/permissions - Obtener permisos
  .get('/:accountId/:extensionId/permissions', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const extensionId = decodeURIComponent(params.extensionId);
      const permissions = await extensionPermissionsService.getPermissions(
        params.accountId,
        extensionId
      );

      if (!permissions) {
        set.status = 404;
        return { success: false, message: 'Extension not installed for this account' };
      }

      return {
        success: true,
        data: permissions,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
    }),
  })

  // POST /extensions/:accountId/:extensionId/permissions - Otorgar permisos
  .post('/:accountId/:extensionId/permissions', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const extensionId = decodeURIComponent(params.extensionId);
      const { permissions, grantedBy, canShare } = body as any;

      const result = await extensionPermissionsService.grantPermissions({
        accountId: params.accountId,
        extensionId,
        permissions,
        grantedBy: grantedBy || params.accountId,
        canShare: canShare ?? false,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
    }),
    body: t.Object({
      permissions: t.Array(t.String()),
      grantedBy: t.Optional(t.String()),
      canShare: t.Optional(t.Boolean()),
    }),
  })

  // DELETE /extensions/:accountId/:extensionId/permissions - Revocar permisos
  .delete('/:accountId/:extensionId/permissions', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const extensionId = decodeURIComponent(params.extensionId);
      const { permissions } = body as any;

      const result = await extensionPermissionsService.revokePermissions({
        accountId: params.accountId,
        extensionId,
        permissions,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
    }),
    body: t.Object({
      permissions: t.Array(t.String()),
    }),
  })

  // GET /extensions/:accountId/:extensionId/can-share - Verificar si puede compartir
  .get('/:accountId/:extensionId/can-share', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const userAccounts = await accountService.getAccountsByUserId(user.id);
      const allowed = userAccounts.some((a) => a.id === params.accountId);
      if (!allowed) {
        set.status = 403;
        return { success: false, message: 'Account does not belong to user' };
      }

      const extensionId = decodeURIComponent(params.extensionId);
      const result = await extensionPermissionsService.canGrantPermissions(
        params.accountId,
        extensionId
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      extensionId: t.String(),
    }),
  });
