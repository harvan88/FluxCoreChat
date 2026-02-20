import { Elysia, t } from 'elysia';
import { sessionProjectionService } from '../services/session-projection.service';

export const kernelSessionsRoutes = new Elysia({ prefix: '/kernel/sessions' }).get(
    '/active',
    async ({ query }) => {
        const statuses = query.status
            ? query.status
                  .split(',')
                  .map((status) => status.trim())
                  .filter((status) => status.length > 0)
            : ['active', 'pending'];

        const sessions = await sessionProjectionService.listSessions({
            accountId: query.accountId,
            actorId: query.actorId,
            statuses: statuses as Array<'pending' | 'active' | 'invalidated'>,
        });

        return { sessions };
    },
    {
        query: t.Object({
            accountId: t.Optional(t.String()),
            actorId: t.Optional(t.String()),
            status: t.Optional(t.String()),
        }),
    },
);
