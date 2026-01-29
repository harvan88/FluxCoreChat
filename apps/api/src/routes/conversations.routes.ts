import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { conversationService } from '../services/conversation.service';

export const conversationsRoutes = new Elysia({ prefix: '/conversations' })
  .use(authMiddleware)
  // GET /conversations - Listar conversaciones (filtradas por accountId si se provee)
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { accountId } = query;

        // MA-102: Si se provee accountId, filtrar por esa cuenta específica
        if (accountId) {
          // MA-105: Verificar que el accountId pertenece al usuario
          const { accountService } = await import('../services/account.service');
          const userAccounts = await accountService.getAccountsByUserId(user.id);
          const userAccountIds = userAccounts.map(a => a.id);

          if (!userAccountIds.includes(accountId)) {
            set.status = 403;
            return { success: false, message: 'Account does not belong to user' };
          }

          const conversations = await conversationService.getConversationsByAccountId(accountId);
          return { success: true, data: conversations };
        }

        // Fallback: devolver todas las conversaciones del usuario (deprecated behavior)
        const conversations = await conversationService.getConversationsByUserId(user.id);
        return { success: true, data: conversations };
      } catch (error: any) {
        console.error('[API] Error loading conversations:', error);
        set.status = 500;
        return { success: false, message: 'Error al cargar conversaciones', error: error.message };
      }
    },
    {
      isAuthenticated: true,
      query: t.Object({
        accountId: t.Optional(t.String()),
      }),
      detail: { tags: ['Conversations'], summary: 'List conversations for account' },
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
        const conversation = await conversationService.createConversation(
          body.relationshipId,
          body.channel
        );
        return { success: true, data: conversation };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        relationshipId: t.String(),
        channel: t.Union([t.Literal('web'), t.Literal('whatsapp'), t.Literal('telegram')]),
      }),
      detail: { tags: ['Conversations'], summary: 'Create conversation' },
    }
  )
  .get(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const conversation = await conversationService.getConversationById(params.id);
      if (!conversation) {
        set.status = 404;
        return { success: false, message: 'Conversation not found' };
      }

      return { success: true, data: conversation };
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Conversations'], summary: 'Get conversation by ID' },
    }
  )
  .get(
    '/:id/messages',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');
        const limit = parseInt(query.limit || '50');
        const offset = parseInt(query.offset || '0');

        const messages = await messageService.getMessagesByConversationId(params.id, limit, offset);
        return { success: true, data: messages };
      } catch (error: any) {
        console.error('[API] Error loading messages:', error);
        set.status = 500;
        return { success: false, message: 'Error al cargar mensajes', error: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: { tags: ['Conversations'], summary: 'Get conversation messages' },
    }
  )
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const updated = await conversationService.updateConversation(params.id, body);
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
        status: t.Optional(t.Union([t.Literal('active'), t.Literal('archived'), t.Literal('closed')])),
      }),
      detail: { tags: ['Conversations'], summary: 'Update conversation' },
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
        await conversationService.deleteConversation(params.id, user.id);
        return { success: true, message: 'Conversation deleted' };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Conversations'], summary: 'Delete conversation and its messages' },
    }
  );
