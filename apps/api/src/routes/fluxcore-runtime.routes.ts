import { Elysia, t } from 'elysia';
import { fluxcoreService } from '../services/fluxcore.service';

export const fluxcoreRuntimeRoutes = new Elysia({ prefix: '/fluxcore/runtime' })
  .get('/active-assistant', async ({ query, set }) => {
    const accountId = query.accountId;
    if (!accountId) {
      set.status = 400;
      return 'accountId is required';
    }

    try {
      const composition = await fluxcoreService.resolveActiveAssistant(accountId);
      if (!composition) {
        set.status = 404;
        return 'No active assistant found for this account';
      }
      return composition;
    } catch (err: any) {
      console.error('Error resolving active assistant:', err);
      set.status = 500;
      return 'Internal Server Error';
    }
  }, {
    query: t.Object({
      accountId: t.String()
    })
  })
  .get('/composition/:assistantId', async ({ params, set }) => {
    try {
      const composition = await fluxcoreService.getAssistantComposition(params.assistantId);
      if (!composition) {
        set.status = 404;
        return 'Assistant not found';
      }
      return composition;
    } catch (err: any) {
      console.error('Error fetching assistant composition:', err);
      set.status = 500;
      return 'Internal Server Error';
    }
  }, {
    params: t.Object({
      assistantId: t.String()
    })
  });
