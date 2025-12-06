import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { messageCore } from '../core/message-core';

export const messagesRoutes = new Elysia({ prefix: '/messages' })
  .use(authMiddleware)
  .post(
    '/',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const result = await messageCore.send({
          conversationId: body.conversationId,
          senderAccountId: body.senderAccountId,
          content: body.content,
          type: body.type || 'outgoing',
          generatedBy: body.generatedBy || 'human',
        });

        if (!result.success) {
          set.status = 400;
          return { success: false, message: result.error };
        }

        return { success: true, data: { messageId: result.messageId } };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        conversationId: t.String(),
        senderAccountId: t.String(),
        content: t.Object({
          text: t.String(),
          media: t.Optional(t.Array(t.Any())),
          location: t.Optional(t.Any()),
          buttons: t.Optional(t.Array(t.Any())),
        }),
        type: t.Optional(t.Union([t.Literal('incoming'), t.Literal('outgoing'), t.Literal('system')])),
        generatedBy: t.Optional(t.Union([t.Literal('human'), t.Literal('ai')])),
      }),
      detail: { tags: ['Messages'], summary: 'Send message' },
    }
  )
  .get(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { messageService } = await import('../services/message.service');
      const message = await messageService.getMessageById(params.id);

      if (!message) {
        set.status = 404;
        return { success: false, message: 'Message not found' };
      }

      return { success: true, data: message };
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Messages'], summary: 'Get message by ID' },
    }
  );
