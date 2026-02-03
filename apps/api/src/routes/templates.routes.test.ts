import { describe, it, expect, mock } from 'bun:test';
import {
  listTemplatesHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from './templates.routes';
import type { TemplateService } from '../services/template.service';

type MockCtx<TBody = any, TQuery = any, TParams = any> = {
  user: { id: string } | null;
  body: TBody;
  query: TQuery;
  params: TParams;
  set: { status?: number | string };
};

const createCtx = <TBody, TQuery, TParams>(ctx: Partial<MockCtx<TBody, TQuery, TParams>> = {}): MockCtx<TBody, TQuery, TParams> => ({
  user: ctx.user === undefined ? { id: 'user-1' } : ctx.user,
  body: ctx.body as TBody,
  query: ctx.query as TQuery,
  params: ctx.params as TParams,
  set: ctx.set ?? { status: undefined },
});

const serviceStub = (): TemplateService => ({
  listTemplates: mock(() => Promise.resolve([])),
  createTemplate: mock(() => Promise.resolve({ id: 'tpl-1' } as any)),
  updateTemplate: mock(() => Promise.resolve({ id: 'tpl-1' } as any)),
  deleteTemplate: mock(() => Promise.resolve()),
} as unknown as TemplateService);

describe('templates.routes handlers', () => {
  describe('listTemplatesHandler', () => {
    it('rejects unauthenticated users', async () => {
      const ctx = createCtx({ user: null, query: { accountId: 'acc-1' }, set: { status: undefined } });
      const res = await listTemplatesHandler(ctx, serviceStub());

      expect(ctx.set.status).toBe(401);
      expect(res.success).toBe(false);
    });

    it('validates accountId parameter', async () => {
      const ctx = createCtx({ query: {}, set: { status: undefined } });
      const res = await listTemplatesHandler(ctx, serviceStub());

      expect(ctx.set.status).toBe(400);
      expect(res.message).toContain('accountId');
    });

    it('returns templates for valid request', async () => {
      const service = serviceStub();
      (service.listTemplates as any).mockResolvedValue([{ id: 'tpl-1' }]);
      const ctx = createCtx({ query: { accountId: 'acc-1' }, set: { status: undefined } });

      const res = await listTemplatesHandler(ctx, service);

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(service.listTemplates).toHaveBeenCalledWith('acc-1');
    });
  });

  describe('createTemplateHandler', () => {
    it('rejects unauthenticated users', async () => {
      const ctx = createCtx({ user: null, body: { accountId: 'acc-1', name: 'N', content: 'C' } });
      const res = await createTemplateHandler(ctx, serviceStub());

      expect(ctx.set.status).toBe(401);
      expect(res.success).toBe(false);
    });

    it('creates template with service call', async () => {
      const service = serviceStub();
      const ctx = createCtx({ body: { accountId: 'acc-1', name: 'Offer', content: 'Hi' } });

      const res = await createTemplateHandler(ctx, service);

      expect(res.success).toBe(true);
      expect(service.createTemplate).toHaveBeenCalledWith('acc-1', ctx.body);
    });
  });

  describe('updateTemplateHandler', () => {
    it('rejects unauthenticated users', async () => {
      const ctx = createCtx({ user: null, body: { accountId: 'acc-1' }, params: { id: 'tpl-1' } });
      const res = await updateTemplateHandler(ctx, serviceStub());

      expect(ctx.set.status).toBe(401);
      expect(res.success).toBe(false);
    });

    it('updates template via service', async () => {
      const service = serviceStub();
      const ctx = createCtx({ body: { accountId: 'acc-1', name: 'New' }, params: { id: 'tpl-1' } });

      const res = await updateTemplateHandler(ctx, service);

      expect(res.success).toBe(true);
      expect(service.updateTemplate).toHaveBeenCalledWith('acc-1', 'tpl-1', ctx.body);
    });
  });

  describe('deleteTemplateHandler', () => {
    it('rejects unauthenticated users', async () => {
      const ctx = createCtx({ user: null, query: { accountId: 'acc-1' }, params: { id: 'tpl-1' } });
      const res = await deleteTemplateHandler(ctx, serviceStub());

      expect(ctx.set.status).toBe(401);
      expect(res.success).toBe(false);
    });

    it('requires accountId query param', async () => {
      const ctx = createCtx({ query: {}, params: { id: 'tpl-1' } });
      const res = await deleteTemplateHandler(ctx, serviceStub());

      expect(ctx.set.status).toBe(400);
      expect(res.success).toBe(false);
    });

    it('deletes template via service', async () => {
      const service = serviceStub();
      const ctx = createCtx({ query: { accountId: 'acc-1' }, params: { id: 'tpl-1' } });

      const res = await deleteTemplateHandler(ctx, service);

      expect(res.success).toBe(true);
      expect(service.deleteTemplate).toHaveBeenCalledWith('acc-1', 'tpl-1');
    });
  });
});
