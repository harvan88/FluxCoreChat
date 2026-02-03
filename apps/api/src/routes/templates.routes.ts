import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { templateService, type TemplateService } from '../services/template.service';

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
  return { success: true, data: templates };
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
    const template = await service.createTemplate(ctx.body.accountId, ctx.body as any);
    return { success: true, data: template };
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to create template' };
  }
}

export async function updateTemplateHandler(
  ctx: HandlerContext<{ accountId: string }, any, { id: string }>,
  service: TemplateService = templateService
) {
  if (!ctx.user) {
    ctx.set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }

  try {
    const template = await service.updateTemplate(ctx.body.accountId, ctx.params.id, ctx.body as any);
    return { success: true, data: template };
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to update template' };
  }
}

export async function deleteTemplateHandler(
  ctx: HandlerContext<unknown, { accountId?: string }, { id: string }>,
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
    await service.deleteTemplate(accountId, ctx.params.id);
    return { success: true };
  } catch (error: any) {
    ctx.set.status = 400;
    return { success: false, message: error?.message ?? 'Failed to delete template' };
  }
}

export const templatesRoutes = new Elysia({ prefix: '/templates' })
  .use(authMiddleware)
  .get('', (ctx) => listTemplatesHandler(ctx), {
    query: t.Object({
      accountId: t.String(),
    }),
    detail: {
      tags: ['Templates'],
      summary: 'List templates by account',
    },
  })
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
    }),
    detail: {
      tags: ['Templates'],
      summary: 'Create template',
    },
  })
  .post('/', (ctx) => createTemplateHandler(ctx), {
    body: t.Object({
      accountId: t.String(),
      name: t.String({ minLength: 1, maxLength: 255 }),
      content: t.String({ minLength: 1 }),
      category: t.Optional(t.String({ maxLength: 100 })),
      variables: t.Optional(t.Array(t.Any())),
      tags: t.Optional(t.Array(t.String())),
      isActive: t.Optional(t.Boolean()),
    }),
    detail: {
      tags: ['Templates'],
      summary: 'Create template',
    },
  })
  .put('/:id', (ctx) => updateTemplateHandler(ctx), {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      accountId: t.String(),
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      content: t.Optional(t.String({ minLength: 1 })),
      category: t.Optional(t.String({ maxLength: 100 })),
      variables: t.Optional(t.Array(t.Any())),
      tags: t.Optional(t.Array(t.String())),
      isActive: t.Optional(t.Boolean()),
    }),
    detail: {
      tags: ['Templates'],
      summary: 'Update template',
    },
  })
  .delete('/:id', (ctx) => deleteTemplateHandler(ctx), {
    params: t.Object({ id: t.String() }),
    query: t.Object({ accountId: t.String() }),
    detail: {
      tags: ['Templates'],
      summary: 'Delete template',
    },
  });
