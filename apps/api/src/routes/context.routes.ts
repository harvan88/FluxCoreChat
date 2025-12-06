/**
 * Context Routes - API para gestión de contexto relacional
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { relationshipContextService } from '../services/relationship-context.service';

export const contextRoutes = new Elysia({ prefix: '/context' })
  .use(authMiddleware)

  // GET /context/:relationshipId - Obtener contexto de una relación
  .get('/:relationshipId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const context = await relationshipContextService.getContext(params.relationshipId);
      
      if (!context) {
        set.status = 404;
        return { success: false, message: 'Relationship not found' };
      }

      const charInfo = await relationshipContextService.getAvailableChars(params.relationshipId);

      return {
        success: true,
        data: {
          ...context,
          charLimit: charInfo,
        },
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      relationshipId: t.String(),
    }),
  })

  // POST /context/:relationshipId/entries - Agregar entrada de contexto
  .post('/:relationshipId/entries', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { authorAccountId, content, type } = body as any;

      const result = await relationshipContextService.addEntry({
        relationshipId: params.relationshipId,
        authorAccountId,
        content,
        type,
      });

      if (!result.success) {
        set.status = 400;
        return { success: false, message: result.error };
      }

      return {
        success: true,
        data: result.context,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      relationshipId: t.String(),
    }),
    body: t.Object({
      authorAccountId: t.String(),
      content: t.String(),
      type: t.Union([t.Literal('note'), t.Literal('preference'), t.Literal('rule')]),
    }),
  })

  // PATCH /context/:relationshipId/entries/:index - Actualizar entrada
  .patch('/:relationshipId/entries/:index', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { content, type } = body as any;
      const entryIndex = parseInt(params.index);

      if (isNaN(entryIndex)) {
        set.status = 400;
        return { success: false, message: 'Invalid entry index' };
      }

      const result = await relationshipContextService.updateEntry({
        relationshipId: params.relationshipId,
        entryIndex,
        content,
        type,
      });

      if (!result.success) {
        set.status = 400;
        return { success: false, message: result.error };
      }

      return {
        success: true,
        data: result.context,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      relationshipId: t.String(),
      index: t.String(),
    }),
    body: t.Object({
      content: t.Optional(t.String()),
      type: t.Optional(t.Union([t.Literal('note'), t.Literal('preference'), t.Literal('rule')])),
    }),
  })

  // DELETE /context/:relationshipId/entries/:index - Eliminar entrada
  .delete('/:relationshipId/entries/:index', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const entryIndex = parseInt(params.index);

      if (isNaN(entryIndex)) {
        set.status = 400;
        return { success: false, message: 'Invalid entry index' };
      }

      const result = await relationshipContextService.deleteEntry(
        params.relationshipId,
        entryIndex
      );

      if (!result.success) {
        set.status = 400;
        return { success: false, message: result.error };
      }

      return {
        success: true,
        data: result.context,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      relationshipId: t.String(),
      index: t.String(),
    }),
  })

  // GET /context/:relationshipId/perspective/:accountId - Obtener perspectiva
  .get('/:relationshipId/perspective/:accountId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const perspective = await relationshipContextService.getPerspective(
        params.relationshipId,
        params.accountId
      );

      if (!perspective) {
        set.status = 404;
        return { success: false, message: 'Perspective not found' };
      }

      return {
        success: true,
        data: perspective,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      relationshipId: t.String(),
      accountId: t.String(),
    }),
  })

  // PATCH /context/:relationshipId/perspective/:accountId - Actualizar perspectiva
  .patch('/:relationshipId/perspective/:accountId', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { savedName, tags, status } = body as any;

      const result = await relationshipContextService.updatePerspective({
        relationshipId: params.relationshipId,
        accountId: params.accountId,
        savedName,
        tags,
        status,
      });

      if (!result.success) {
        set.status = 400;
        return { success: false, message: result.error };
      }

      return {
        success: true,
        data: result.perspective,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      relationshipId: t.String(),
      accountId: t.String(),
    }),
    body: t.Object({
      savedName: t.Optional(t.Nullable(t.String())),
      tags: t.Optional(t.Array(t.String())),
      status: t.Optional(t.Union([t.Literal('active'), t.Literal('blocked'), t.Literal('archived')])),
    }),
  })

  // GET /context/:relationshipId/chars - Obtener límite de caracteres
  .get('/:relationshipId/chars', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const charInfo = await relationshipContextService.getAvailableChars(params.relationshipId);

      if (!charInfo) {
        set.status = 404;
        return { success: false, message: 'Relationship not found' };
      }

      return {
        success: true,
        data: charInfo,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      relationshipId: t.String(),
    }),
  });

export default contextRoutes;
