import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { conversationService } from '../services/conversation.service';

export const conversationsRoutes = new Elysia({ prefix: '/conversations' })
  .use(authMiddleware)
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

      const { messageService } = await import('../services/message.service');
      const limit = parseInt(query.limit || '50');
      const offset = parseInt(query.offset || '0');

      const messages = await messageService.getMessagesByConversationId(params.id, limit, offset);
      return { success: true, data: messages };
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
  );
