import { Elysia, t } from 'elysia';
import { accountDeletionAdminService } from '../services/account-deletion.admin.service';
import { systemAdminService } from '../services/system-admin.service';
import type { accountDeletionJobs } from '@fluxcore/db';

const RETRIABLE_PHASES = ['external_cleanup', 'local_cleanup'] as const;
type DeletionPhase = (typeof accountDeletionJobs.$inferSelect)['phase'];

async function requireForceScope(
  headers: Record<string, string | undefined>,
  set: { status?: number | string },
) {
  const userId = headers['x-user-id'];
  const headerScope = headers['x-admin-scope'];

  if (headerScope === 'ACCOUNT_DELETE_FORCE') {
    return userId ?? 'scope-token';
  }

  if (!userId) {
    set.status = 401;
    throw new Error('No autenticado');
  }

  const allowed = await systemAdminService.hasScope(userId, 'ACCOUNT_DELETE_FORCE');
  if (!allowed) {
    set.status = 403;
    throw new Error('Acceso denegado. Scope ACCOUNT_DELETE_FORCE requerido');
  }

  return userId;
}

export const accountDeletionAdminRoutes = new Elysia({ prefix: '/internal/account-deletions' })
  .get(
    '/',
    async ({ headers, query, set }) => {
      try {
        await requireForceScope(headers as Record<string, string | undefined>, set);
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }

      const limit = query?.limit ? Number(query.limit) : undefined;
      const statuses = Array.isArray(query?.status)
        ? (query.status as string[])
        : query?.status
          ? [String(query.status)]
          : undefined;

      const jobs = await accountDeletionAdminService.listJobs({
        limit,
        statuses: statuses as Array<(typeof accountDeletionJobs.$inferSelect)['status']> | undefined,
      });

      return { success: true, data: jobs };
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        status: t.Optional(t.Union([t.String(), t.Array(t.String())])),
      }),
      detail: {
        tags: ['Account Deletion'],
        summary: 'Admin: listar jobs de eliminación',
      },
    },
  )
  .get(
    '/stats',
    async ({ headers, set }) => {
      try {
        await requireForceScope(headers as Record<string, string | undefined>, set);
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }

      const stats = await accountDeletionAdminService.getStats();
      return { success: true, data: stats };
    },
    {
      detail: {
        tags: ['Account Deletion'],
        summary: 'Admin: métricas de jobs y cola',
      },
    },
  )
  .get(
    '/logs',
    async ({ headers, query, set }) => {
      try {
        await requireForceScope(headers as Record<string, string | undefined>, set);
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }

      const limit = query?.limit ? Number(query.limit) : undefined;
      const createdAfter = query?.createdAfter ? new Date(String(query.createdAfter)) : undefined;
      const createdBefore = query?.createdBefore ? new Date(String(query.createdBefore)) : undefined;

      try {
        const logs = await accountDeletionAdminService.listLogs({
          limit,
          accountId: query?.accountId as string | undefined,
          jobId: query?.jobId as string | undefined,
          status: query?.status as any,
          createdAfter: createdAfter && !Number.isNaN(createdAfter.valueOf()) ? createdAfter : undefined,
          createdBefore: createdBefore && !Number.isNaN(createdBefore.valueOf()) ? createdBefore : undefined,
        });
        return { success: true, data: logs };
      } catch (error: any) {
        set.status = 400;
        return { success: false, error: error?.message || 'Failed to fetch logs' };
      }
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        accountId: t.Optional(t.String()),
        jobId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        createdAfter: t.Optional(t.String()),
        createdBefore: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Account Deletion'],
        summary: 'Admin: listar logs de eliminación',
      },
    },
  )
  .get(
    '/references',
    async ({ headers, query, set }) => {
      try {
        await requireForceScope(headers as Record<string, string | undefined>, set);
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }

      if (!query?.accountId) {
        set.status = 400;
        return { success: false, error: 'accountId es requerido' };
      }

      try {
        const references = await accountDeletionAdminService.findAccountReferences(String(query.accountId));
        return { success: true, data: references };
      } catch (error: any) {
        set.status = 400;
        return { success: false, error: error?.message || 'No se pudieron obtener las referencias' };
      }
    },
    {
      query: t.Object({
        accountId: t.String(),
      }),
      detail: {
        tags: ['Account Deletion'],
        summary: 'Admin: listar referencias de datos para una cuenta',
      },
    },
  )
  .get(
    '/orphans',
    async ({ headers, query, set }) => {
      try {
        await requireForceScope(headers as Record<string, string | undefined>, set);
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }

      const sampleLimit = query?.sampleLimit ? Number(query.sampleLimit) : undefined;

      try {
        const orphans = await accountDeletionAdminService.listAccountReferenceOrphans(sampleLimit);
        return { success: true, data: orphans };
      } catch (error: any) {
        set.status = 400;
        return { success: false, error: error?.message || 'No se pudieron obtener los orphans' };
      }
    },
    {
      query: t.Object({
        sampleLimit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Account Deletion'],
        summary: 'Admin: listar referencias huérfanas por tabla/columna',
      },
    },
  )
  .post(
    '/:jobId/retry-phase',
    async ({ headers, params, body, set }) => {
      try {
        await requireForceScope(headers as Record<string, string | undefined>, set);
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }

      const phase = body.phase as DeletionPhase;
      if (!RETRIABLE_PHASES.includes(phase as any)) {
        set.status = 400;
        return { success: false, error: 'Fase no soportada para reintento' };
      }

      try {
        const result = await accountDeletionAdminService.retryJobPhase(params.jobId, phase);
        return { success: true, data: result };
      } catch (error) {
        set.status = 400;
        return { success: false, error: (error as Error).message };
      }
    },
    {
      params: t.Object({ jobId: t.String() }),
      body: t.Object({ phase: t.String() }),
      detail: {
        tags: ['Account Deletion'],
        summary: 'Admin: reintentar fase de un job',
      },
    },
  );
