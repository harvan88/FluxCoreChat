import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { relationshipService } from '../services/relationship.service';

export const relationshipsRoutes = new Elysia({ prefix: '/relationships' })
  .use(authMiddleware)
  .get(
    '/',
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      // Get all accounts of the user
      const { accountService } = await import('../services/account.service');
      const accounts = await accountService.getAccountsByUserId(user.id);
      
      // Get relationships for all accounts
      const allRelationships = [];
      for (const account of accounts) {
        const rels = await relationshipService.getRelationshipsByAccountId(account.id);
        allRelationships.push(...rels);
      }

      return { success: true, data: allRelationships };
    },
    {
      isAuthenticated: true,
      detail: { tags: ['Relationships'], summary: 'Get user relationships' },
    }
  )
  .post(
    '/',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const relationship = await relationshipService.createRelationship(
          body.accountAId,
          body.accountBId
        );
        return { success: true, data: relationship };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        accountAId: t.String(),
        accountBId: t.String(),
      }),
      detail: { tags: ['Relationships'], summary: 'Create relationship' },
    }
  )
  .patch(
    '/:id/perspective',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const updated = await relationshipService.updatePerspective(
          params.id,
          body.accountId,
          body.perspective
        );
        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        accountId: t.String(),
        perspective: t.Object({
          saved_name: t.Optional(t.Nullable(t.String())),
          tags: t.Optional(t.Array(t.String())),
          status: t.Optional(t.Union([t.Literal('active'), t.Literal('blocked'), t.Literal('archived')])),
        }),
      }),
      detail: { tags: ['Relationships'], summary: 'Update relationship perspective' },
    }
  )
  .post(
    '/:id/context',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const updated = await relationshipService.addContextEntry(params.id, {
          author_account_id: body.authorAccountId,
          content: body.content,
          type: body.type,
        });
        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        authorAccountId: t.String(),
        content: t.String({ maxLength: 2000 }),
        type: t.Union([t.Literal('note'), t.Literal('preference'), t.Literal('rule')]),
      }),
      detail: { tags: ['Relationships'], summary: 'Add context entry' },
    }
  );
