/**
 * Website Routes
 * Extension Karen - Website Builder
 * API endpoints para gestión de sitios web
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { websiteService } from '../services/website.service';
import { staticGenerator } from '../services/static-generator.service';

function getPublicSiteBaseUrl(request: Request): string {
  const explicit = (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;

  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || url.host;
  const proto = forwardedProto || url.protocol.replace(':', '') || 'http';
  return `${proto}://${host}`;
}

export const websiteRoutes = new Elysia({ prefix: '/websites' })
  .use(authMiddleware)

  // GET /websites/:accountId - Obtener configuración del sitio
  .get('/:accountId', async ({ user, params, set, request }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const config = await websiteService.getByAccountId(params.accountId);
      
      if (!config) {
        set.status = 404;
        return { success: false, message: 'Website config not found' };
      }

      // Obtener alias para URL pública
      const alias = await websiteService.getPublicAlias(params.accountId);

      const baseUrl = getPublicSiteBaseUrl(request);

      return {
        success: true,
        data: {
          ...config,
          publicUrl: alias ? `${baseUrl}/${alias}` : null,
        },
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

  // POST /websites/:accountId - Crear configuración del sitio
  .post('/:accountId', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { config, pages } = body as any;

      const created = await websiteService.create({
        accountId: params.accountId,
        config,
        pages,
      });

      return {
        success: true,
        data: created,
      };
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        set.status = 409;
        return { success: false, message: error.message };
      }
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
    body: t.Object({
      config: t.Optional(t.Any()),
      pages: t.Optional(t.Array(t.Any())),
    }),
  })

  // PATCH /websites/:accountId - Actualizar configuración del sitio
  .patch('/:accountId', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { config, pages, status } = body as any;

      const updated = await websiteService.update(params.accountId, {
        config,
        pages,
        status,
      });

      if (!updated) {
        set.status = 404;
        return { success: false, message: 'Website config not found' };
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
    }),
    body: t.Object({
      config: t.Optional(t.Any()),
      pages: t.Optional(t.Array(t.Any())),
      status: t.Optional(t.String()),
    }),
  })

  // DELETE /websites/:accountId - Eliminar configuración del sitio
  .delete('/:accountId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const deleted = await websiteService.delete(params.accountId);

      if (!deleted) {
        set.status = 404;
        return { success: false, message: 'Website config not found' };
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
    }),
  })

  // POST /websites/:accountId/pages - Agregar página
  .post('/:accountId/pages', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { path, title, description, content, frontmatter } = body as any;

      const updated = await websiteService.addPage(params.accountId, {
        path,
        title,
        description,
        content,
        frontmatter,
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        set.status = 409;
      } else if (error.message.includes('not found')) {
        set.status = 404;
      } else {
        set.status = 500;
      }
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
    body: t.Object({
      path: t.String(),
      title: t.String(),
      description: t.Optional(t.String()),
      content: t.String(),
      frontmatter: t.Optional(t.Any()),
    }),
  })

  // PATCH /websites/:accountId/pages/:path - Actualizar página
  // Nota: La home ("/") requiere endpoint explícito porque /pages/* no matchea /pages
  .patch('/:accountId/pages', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { title, description, content, frontmatter } = body as any;
      const updated = await websiteService.updatePage(params.accountId, '/', {
        title,
        description,
        content,
        frontmatter,
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        set.status = 404;
      } else {
        set.status = 500;
      }
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      content: t.Optional(t.String()),
      frontmatter: t.Optional(t.Any()),
    }),
  })

  .patch('/:accountId/pages/*', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      // El path viene como wildcard, extraerlo
      const pagePath = '/' + ((params as any)['*'] || '');
      const { title, description, content, frontmatter } = body as any;

      const updated = await websiteService.updatePage(params.accountId, pagePath, {
        title,
        description,
        content,
        frontmatter,
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        set.status = 404;
      } else {
        set.status = 500;
      }
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      content: t.Optional(t.String()),
      frontmatter: t.Optional(t.Any()),
    }),
  })

  // DELETE /websites/:accountId/pages/:path - Eliminar página
  .delete('/:accountId/pages/*', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const pagePath = '/' + ((params as any)['*'] || '');

      const updated = await websiteService.deletePage(params.accountId, pagePath);

      return {
        success: true,
        data: updated,
      };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        set.status = 404;
      } else {
        set.status = 500;
      }
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
  })

  // POST /websites/:accountId/publish - Publicar sitio
  .post('/:accountId/publish', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const updated = await websiteService.publish(params.accountId);

      return {
        success: true,
        data: updated,
        message: 'Website published successfully',
      };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        set.status = 404;
      } else {
        set.status = 500;
      }
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
  })

  // POST /websites/:accountId/unpublish - Despublicar sitio
  .post('/:accountId/unpublish', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const updated = await websiteService.unpublish(params.accountId);

      if (!updated) {
        set.status = 404;
        return { success: false, message: 'Website config not found' };
      }

      return {
        success: true,
        data: updated,
        message: 'Website unpublished',
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

  // POST /websites/:accountId/build - Generar sitio estático
  .post('/:accountId/build', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const result = await staticGenerator.generateSite(params.accountId);

      return {
        success: true,
        data: {
          pagesGenerated: result.pages.length,
          buildHash: result.buildHash,
          generatedAt: result.generatedAt,
        },
        message: 'Website built successfully',
      };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        set.status = 404;
      } else {
        set.status = 500;
      }
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
  });
