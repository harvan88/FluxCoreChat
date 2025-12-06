/**
 * Extension Routes
 * FC-158-166: API endpoints para gestión de extensiones
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { extensionService } from '../services/extension.service';
import { extensionHost } from '../services/extension-host.service';
import { manifestLoader } from '../services/manifest-loader.service';

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

      // Verificar que la extensión existe
      const manifest = manifestLoader.getManifest(extensionId);
      if (!manifest) {
        set.status = 404;
        return { success: false, message: `Extension ${extensionId} not found` };
      }

      // Obtener configuración por defecto
      const defaultConfig = manifestLoader.getDefaultConfig(extensionId);

      // Instalar
      const installation = await extensionService.install({
        accountId,
        extensionId,
        version: manifest.version,
        config: defaultConfig,
        grantedPermissions: grantPermissions || manifest.permissions,
      });

      return {
        success: true,
        data: installation,
      };
    } catch (error: any) {
      if (error.message.includes('already installed')) {
        set.status = 409;
      } else {
        set.status = 500;
      }
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
      const extensionId = decodeURIComponent(params.extensionId);
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
      const extensionId = decodeURIComponent(params.extensionId);
      const updated = await extensionService.setEnabled(params.accountId, extensionId, true);
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
      const extensionId = decodeURIComponent(params.extensionId);
      const updated = await extensionService.setEnabled(params.accountId, extensionId, false);
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
  .get('/manifest/:extensionId', async ({ params, set }) => {
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
  });
