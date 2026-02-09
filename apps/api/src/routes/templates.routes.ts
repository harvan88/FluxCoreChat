import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { templateService, type TemplateService } from '../services/template.service';
import { fluxCoreTemplateSettingsService } from '../services/fluxcore/template-settings.service';

interface HandlerContext<TBody = any, TQuery = any, TParams = any> {
  user: { id: string } | null;
  body: TBody;
  query: TQuery;
  params: TParams;
  set: { status?: number | string };
}

export async function listTemplatesHandler(
  ctx: HandlerContext<unknown, { accountId?: string }, unknown>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }

  const accountId = ctx.query.accountId;
  if (!accountId) {
    ctx.set.status = 400;
    return { success: false, message: 'accountId is required' };
  }

  const templates = await service.listTemplates(accountId);

  // Enriquecer con FluxCore Settings
  const ids = templates.map(t => t.id);
  const settingsMap = await fluxCoreTemplateSettingsService.getSettingsMap(ids);

  const enriched = templates.map(t => ({
    ...t,
    authorizeForAI: settingsMap.get(t.id)?.authorizeForAI || false,
    aiUsageInstructions: settingsMap.get(t.id)?.aiUsageInstructions || null
  }));

  return { success: true, data: enriched };
}

export async function getTemplateHandler(
  ctx: HandlerContext<unknown, { accountId?: string }, { templateId: string }>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }

  const accountId = ctx.query.accountId;
  if (!accountId) {
    ctx.set.status = 400;
    return { success: false, message: 'accountId is required' };
  }

  try {
    const template = await service.getTemplate(accountId, ctx.params.templateId);

    // Enriquecer con FluxCore Settings
    const settings = await fluxCoreTemplateSettingsService.getSettings(template.id);

    return {
      success: true,
      data: {
        ...template,
        authorizeForAI: settings.authorizeForAI,
        aiUsageInstructions: settings.aiUsageInstructions
      }
    };
  } catch (error: any) {
    ctx.set.status = 404;
    return { success: false, message: error?.message ?? 'Template not found' };
  }
}

export async function createTemplateHandler(
  ctx: HandlerContext<{ accountId: string }>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }

  try {
    const input = ctx.body as any;
    const template = await service.createTemplate(input.accountId, input);

    // Guardar configuración de FluxCore
    if (typeof input.authorizeForAI === 'boolean' || input.aiUsageInstructions) {
      await fluxCoreTemplateSettingsService.updateSettings(
        template.id,
        input.authorizeForAI ?? false,
        input.aiUsageInstructions
      );
    }

    return {
      success: true,
      data: {
        ...template,
        authorizeForAI: input.authorizeForAI ?? false,
        aiUsageInstructions: input.aiUsageInstructions
      }
    };
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to create template' };
  }
}

export async function updateTemplateHandler(
  ctx: HandlerContext<{ accountId: string }, any, { templateId: string }>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }

  try {
    const input = ctx.body as any;
    const template = await service.updateTemplate(input.accountId, ctx.params.templateId, input);

    // Actualizar configuración de FluxCore (si viene en el body)
    if (typeof input.authorizeForAI === 'boolean' || input.aiUsageInstructions !== undefined) {
      const current = await fluxCoreTemplateSettingsService.getSettings(template.id);
      await fluxCoreTemplateSettingsService.updateSettings(
        template.id,
        input.authorizeForAI ?? current.authorizeForAI,
        input.aiUsageInstructions !== undefined ? input.aiUsageInstructions : current.aiUsageInstructions
      );
    }

    // Obtener estado final
    const finalSettings = await fluxCoreTemplateSettingsService.getSettings(template.id);

    return {
      success: true,
      data: {
        ...template,
        authorizeForAI: finalSettings.authorizeForAI,
        aiUsageInstructions: finalSettings.aiUsageInstructions
      }
    };
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to update template' };
  }
}

export async function deleteTemplateHandler(
  ctx: HandlerContext<unknown, { accountId?: string }, { templateId: string }>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }

  const accountId = ctx.query.accountId;
  if (!accountId) {
    ctx.set.status = 400;
    return { success: false, message: 'accountId is required' };
  }

  try {
    await service.deleteTemplate(accountId, ctx.params.templateId);
    return { success: true };
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to delete template' };
  }
}

export async function executeTemplateHandler(
  ctx: HandlerContext<{
    conversationId: string;
    accountId: string;
    variables?: Record<string, string>;
  }, any, { templateId: string }>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }

  try {
    const result = await service.executeTemplate({
      templateId: ctx.params.templateId,
      accountId: ctx.body.accountId,
      conversationId: ctx.body.conversationId,
      variables: ctx.body.variables,
      generatedBy: 'human'
    });
    return result;
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to execute template' };
  }
}

export async function linkTemplateAssetHandler(
  ctx: HandlerContext<{ assetId: string; slot?: string }, { accountId?: string }, { templateId: string }>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }
  const accountId = ctx.query.accountId;
  if (!accountId) {
    ctx.set.status = 400;
    return { success: false, message: 'accountId is required' };
  }
  try {
    await service.linkAsset(accountId, ctx.params.templateId, ctx.body.assetId, ctx.body.slot);
    return { success: true };
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to link asset' };
  }
}

export async function unlinkTemplateAssetHandler(
  ctx: HandlerContext<unknown, { accountId?: string, slot?: string }, { templateId: string, assetId: string }>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }
  const accountId = ctx.query.accountId;
  if (!accountId) {
    ctx.set.status = 400;
    return { success: false, message: 'accountId is required' };
  }
  try {
    await service.unlinkAsset(accountId, ctx.params.templateId, ctx.params.assetId, ctx.query.slot);
    return { success: true };
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to unlink asset' };
  }
}

export const templatesRoutes = new Elysia({ prefix: '/api/templates' })
  .use(authMiddleware)
  .get('/', (ctx) => listTemplatesHandler(ctx), {
    query: t.Object({
      accountId: t.String(),
    }),
    detail: {
      tags: ['Templates'],
      summary: 'List templates by account',
    },
  })
  .post('', (ctx) => createTemplateHandler(ctx), {
    body: t.Object({
      accountId: t.String(),
      name: t.String({ minLength: 1, maxLength: 255 }),
      content: t.String({ minLength: 1 }),
      category: t.Optional(t.String({ maxLength: 100 })),
      variables: t.Optional(t.Array(t.Any())),
      tags: t.Optional(t.Array(t.String())),
      isActive: t.Optional(t.Boolean()),
      authorizeForAI: t.Optional(t.Boolean()),
      aiUsageInstructions: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Templates'],
      summary: 'Create template',
    },
  })
  .get('/:templateId', (ctx) => getTemplateHandler(ctx), {
    params: t.Object({ templateId: t.String() }),
    query: t.Object({ accountId: t.String() }),
    detail: {
      tags: ['Templates'],
      summary: 'Get template by id',
    },
  })
  .put('/:templateId', (ctx) => updateTemplateHandler(ctx), {
    params: t.Object({ templateId: t.String() }),
    body: t.Object({
      accountId: t.String(),
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      content: t.Optional(t.String({ minLength: 1 })),
      category: t.Optional(t.String({ maxLength: 100 })),
      variables: t.Optional(t.Array(t.Any())),
      tags: t.Optional(t.Array(t.String())),
      isActive: t.Optional(t.Boolean()),
      authorizeForAI: t.Optional(t.Boolean()),
      aiUsageInstructions: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Templates'],
      summary: 'Update template',
    },
  })
  .delete('/:templateId', (ctx) => deleteTemplateHandler(ctx), {
    params: t.Object({ templateId: t.String() }),
    query: t.Object({ accountId: t.String() }),
    detail: {
      tags: ['Templates'],
      summary: 'Delete template',
    },
  })
  .post('/:templateId/execute', (ctx) => executeTemplateHandler(ctx), {
    params: t.Object({ templateId: t.String() }),
    body: t.Object({
      accountId: t.String(),
      conversationId: t.String(),
      variables: t.Optional(t.Record(t.String(), t.String())),
    }),
    detail: {
      tags: ['Templates'],
      summary: 'Execute/Send template',
    },
  })
  .post('/:templateId/assets', (ctx) => linkTemplateAssetHandler(ctx as any), {
    params: t.Object({ templateId: t.String() }),
    body: t.Object({
      assetId: t.String(),
      slot: t.Optional(t.String()),
    }),
    query: t.Object({ accountId: t.String() }),
    detail: {
      tags: ['Templates'],
      summary: 'Link asset to template',
    },
  })
  .delete('/:templateId/assets/:assetId', (ctx) => unlinkTemplateAssetHandler(ctx as any), {
    params: t.Object({ templateId: t.String(), assetId: t.String() }),
    query: t.Object({ accountId: t.String(), slot: t.Optional(t.String()) }),
    detail: {
      tags: ['Templates'],
      summary: 'Unlink asset from template',
    },
  });
