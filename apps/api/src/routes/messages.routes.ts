import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { messageCore } from '../core/message-core';
import { extensionHost } from '../services/extension-host.service';

import { chatCoreGateway } from '../services/fluxcore/chatcore-gateway.service';

export const messagesRoutes = new Elysia({ prefix: '/messages' })
  .use(authMiddleware)
  .post(
    '/',
    async ({ user, body, set, request }) => {
      const typedBody: any = body as any;
      console.log(`[MessagesRoute] 📥 Incoming POST /messages request from user: ${user?.id}`, {
        hasText: !!typedBody.content?.text,
        mediaCount: typedBody.content?.media?.length || 0
      });

      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        // 🛡️ CHATCORE GATEWAY: Certify Ingress (Reality Adapter)
        // Solo certificamos tráfico humano (no AI/System generado internamente)
        if (typedBody.generatedBy !== 'ai' && typedBody.generatedBy !== 'system') {
          const certification = await chatCoreGateway.certifyIngress({
            accountId: typedBody.senderAccountId, // Business Context
            userId: user.id,                      // Authenticated Actor
            payload: typedBody.content,
            meta: {
              ip: request.headers.get('x-forwarded-for') || undefined,
              userAgent: request.headers.get('user-agent') || undefined,
              clientTimestamp: new Date().toISOString(),
              conversationId: typedBody.conversationId,
              requestId: request.headers.get('x-request-id') || undefined,
            }
          });

          if (!certification.accepted) {
            console.warn(`[MessagesRoute] 🛑 Gateway rejected ingress: ${certification.reason}`);
            set.status = 400; // Rechazado por el Kernel (o error de gateway)
            return { success: false, message: `Gateway rejected: ${certification.reason}` };
          }
        }

        // Asegurar que content es un objeto, no un string
        let content: any = typedBody.content;
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content);
          } catch {
            content = { text: content };
          }
        }

        const result = await messageCore.send({
          conversationId: typedBody.conversationId,
          senderAccountId: typedBody.senderAccountId,
          content,
          type: typedBody.type || 'outgoing',
          generatedBy: typedBody.generatedBy || 'human',
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
          text: t.Optional(t.String()),
          media: t.Optional(t.Array(t.Any())),
          location: t.Optional(t.Any()),
          buttons: t.Optional(t.Array(t.Any())),
        }),
        type: t.Optional(t.Union([t.Literal('incoming'), t.Literal('outgoing'), t.Literal('system')])),
        generatedBy: t.Optional(t.Union([t.Literal('human'), t.Literal('ai')])),
        replyToId: t.Optional(t.String()),
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
  )
  // V2-3: PATCH - Editar mensaje
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');

        // Verificar que el mensaje existe y pertenece al usuario
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        const existingContent = message.content as any;
        const isFluxCoreBranded = existingContent?.__fluxcore?.branding === true;

        const typedBody: any = body as any;
        let nextContent: any = typedBody.content;
        if (isFluxCoreBranded && typeof nextContent?.text === 'string') {
          nextContent = {
            ...nextContent,
            text: extensionHost.appendFluxCoreBrandingFooter(nextContent.text),
            __fluxcore: existingContent.__fluxcore,
          };
        }

        // Actualizar mensaje
        const updated = await messageService.updateMessage(params.id, {
          content: nextContent,
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
        content: t.Object({
          text: t.String(),
        }),
      }),
      detail: { tags: ['Messages'], summary: 'Edit message' },
    }
  )
  // V2-3: DELETE - Eliminar mensaje
  .delete(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');

        // Verificar que el mensaje existe
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        // Eliminar mensaje (soft delete o hard delete)
        await messageService.deleteMessage(params.id);

        return { success: true, data: { deleted: true } };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Messages'], summary: 'Delete message' },
    }
  );
