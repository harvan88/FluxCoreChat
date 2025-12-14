import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { relationshipService } from '../services/relationship.service';

export const relationshipsRoutes = new Elysia({ prefix: '/relationships' })
  .use(authMiddleware)
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { accountId } = query;
      const { accountService } = await import('../services/account.service');
      
      // MA-104: Si se provee accountId, filtrar por esa cuenta específica
      if (accountId) {
        // MA-105: Verificar que el accountId pertenece al usuario
        const userAccounts = await accountService.getAccountsByUserId(user.id);
        const userAccountIds = userAccounts.map(a => a.id);
        
        if (!userAccountIds.includes(accountId)) {
          set.status = 403;
          return { success: false, message: 'Account does not belong to user' };
        }
        
        // Get relationships for this specific account
        const rels = await relationshipService.getRelationshipsByAccountId(accountId);
        
        // Enrich with contact name
        const enrichedRelationships = await Promise.all(
          rels.map(async (rel) => {
            const otherAccountId = rel.accountAId === accountId
              ? rel.accountBId
              : rel.accountAId;
            
            const otherAccount = await accountService.getAccountById(otherAccountId);
            const profile = otherAccount?.profile as { avatarUrl?: string } | null;
            
            return {
              ...rel,
              contactName: otherAccount?.displayName || 'Desconocido',
              contactAccountId: otherAccountId,
              contactAvatar: profile?.avatarUrl,
            };
          })
        );
        
        return { success: true, data: enrichedRelationships };
      }

      // Fallback: Get all accounts of the user (deprecated behavior)
      const accounts = await accountService.getAccountsByUserId(user.id);
      const userAccountIds = accounts.map(a => a.id);
      
      // Get relationships for all accounts
      const allRelationships = [];
      for (const account of accounts) {
        const rels = await relationshipService.getRelationshipsByAccountId(account.id);
        allRelationships.push(...rels);
      }

      // Enrich with contact name (the OTHER account, not the user's)
      const enrichedRelationships = await Promise.all(
        allRelationships.map(async (rel) => {
          // Find the OTHER account ID
          const otherAccountId = userAccountIds.includes(rel.accountAId)
            ? rel.accountBId
            : rel.accountAId;
          
          const otherAccount = await accountService.getAccountById(otherAccountId);
          const profile = otherAccount?.profile as { avatarUrl?: string } | null;
          
          return {
            ...rel,
            contactName: otherAccount?.displayName || 'Desconocido',
            contactAccountId: otherAccountId,
            contactAvatar: profile?.avatarUrl,
          };
        })
      );

      return { success: true, data: enrichedRelationships };
    },
    {
      isAuthenticated: true,
      query: t.Object({
        accountId: t.Optional(t.String()),
      }),
      detail: { tags: ['Relationships'], summary: 'Get relationships for account' },
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
  )
  .delete(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        await relationshipService.deleteRelationship(params.id, user.id);
        return { success: true, message: 'Relationship deleted' };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Relationships'], summary: 'Delete relationship (contact)' },
    }
  );
