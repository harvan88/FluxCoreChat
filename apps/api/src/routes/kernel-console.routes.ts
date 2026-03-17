import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { db, fluxcoreSignals } from '@fluxcore/db';
import { desc, eq, and, or, sql, ilike } from 'drizzle-orm';

const HARVAN_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

export const kernelConsoleRoutes = new Elysia({ prefix: '/kernel/console' })
  .use(authMiddleware)
  .group('', (app) =>
    app
      .derive(({ user, headers, set }) => {
        if (!user) {
          set.status = 401;
          throw new Error('Unauthorized');
        }

        const accountId = headers['x-account-id'];
        if (accountId !== HARVAN_ACCOUNT_ID) {
          set.status = 403;
          throw new Error('Forbidden: Only Harvan can access Kernel Console');
        }

        return { isHarvan: true };
      })
      .get('/signals', async ({ set, query }) => {
        try {
          const { factType, sourceNamespace, search, limit } = query as {
            factType?: string;
            sourceNamespace?: string;
            search?: string;
            limit?: string;
          };

          const conditions = [];

          if (factType) {
            conditions.push(eq(fluxcoreSignals.factType, factType));
          }

          if (sourceNamespace) {
            conditions.push(eq(fluxcoreSignals.sourceNamespace, sourceNamespace));
          }

          if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`;
            conditions.push(
              or(
                ilike(fluxcoreSignals.sourceKey, searchTerm),
                ilike(fluxcoreSignals.subjectKey, searchTerm),
                ilike(fluxcoreSignals.objectKey, searchTerm),
                sql`${fluxcoreSignals.evidenceRaw}::text ILIKE ${searchTerm}`
              )
            );
          }

          const parsedLimit = limit ? parseInt(limit, 10) : 50;
          const finalLimit = isNaN(parsedLimit) || parsedLimit > 200 ? 50 : parsedLimit;

          const signals = await db.query.fluxcoreSignals.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(fluxcoreSignals.sequenceNumber)],
            limit: finalLimit,
          });

          return {
            success: true,
            data: signals,
          };
        } catch (error: any) {
          set.status = 500;
          return { success: false, message: error.message };
        }
      })
  );

export default kernelConsoleRoutes;
