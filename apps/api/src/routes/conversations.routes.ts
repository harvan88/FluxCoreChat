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

          const conversations = await conversationService.getConversationsByAccountId(accountId, { actorId: user.id });
          return { success: true, data: conversations };
        }

        // Fallback: devolver todas las conversaciones del usuario (deprecated behavior)
        const conversations = await conversationService.getConversationsByUserId(user.id, { actorId: user.id });
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
        const conversation = await conversationService.ensureConversation({
          relationshipId: body.relationshipId,
          channel: body.channel,
        });
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

      // 🔥 NUEVA: Validar accountId pertenece al user
      if (query.accountId) {
        const userAccounts = await db
          .select()
          .from(accounts)
          .where(eq(accounts.ownerId, user.id));
        
        const accountIds = userAccounts.map(a => a.id);
        if (!accountIds.includes(query.accountId)) {
          set.status = 403;
          return { success: false, message: 'AccountId no pertenece al usuario' };
        }
      }

      try {
        const { messageService } = await import('../services/message.service');
        const limit = parseInt(query.limit || '50');
        
        // 🆕 Cursor-based pagination: usar cursor en lugar de offset
        const cursor = query.cursor ? new Date(query.cursor) : undefined;
        
        console.log(`[ConversationsRoute] 🆕 CURSOR PAGINATION: limit=${limit}, cursor=${cursor}`);
        
        // 🔥 NUEVO: Obtener viewerRole para perspectiva correcta
        let viewerRole = null;
        let activeAccountId = null;

        // 🔥 CORREGIDO: Usar accountId del JWT, no del query param (seguridad)
        if (query.accountId) {
          // Validar que accountId pertenece al user (ya hecho arriba)
          activeAccountId = query.accountId;
          
          const participant = await db
            .select({ role: conversationParticipants.role })
            .from(conversationParticipants)
            .where(
              and(
                eq(conversationParticipants.conversationId, params.id),
                eq(conversationParticipants.accountId, activeAccountId)
              )
            )
            .limit(1);
          viewerRole = participant[0]?.role || null;
        }

        const messages = await messageService.getMessagesByConversationId(params.id, limit, cursor);

        // 🔥 NUEVO: Agregar viewerRole a cada mensaje para perspectiva correcta
        const messagesWithPerspective = messages.map(msg => ({
          ...msg,
          type: viewerRole 
            ? (viewerRole === 'initiator' && msg.senderAccountId === activeAccountId ? 'outgoing' : 'incoming')
            : (msg.senderAccountId === activeAccountId ? 'outgoing' : 'incoming'), // 🔥 Fallback con activeAccountId del JWT
          viewerRole // 🔥 Incluir viewerRole para debug
        }));
        
        // 🆕 Devolver el cursor del último mensaje para la siguiente página
        const nextCursor = messagesWithPerspective.length > 0 ? messagesWithPerspective[messagesWithPerspective.length - 1].createdAt : null;
        
        return { 
          success: true, 
          data: messagesWithPerspective,
          meta: {
            nextCursor: nextCursor,
            hasMore: messagesWithPerspective.length === limit
          }
        };
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
        cursor: t.Optional(t.String()),
        accountId: t.Optional(t.String()), // 🔥 NUEVO: accountId query param
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
  .post(
    '/convert-visitor',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { visitorToken, ownerAccountId, visitorAccountId } = body;

        // Validate visitorAccountId belongs to user
        const { accountService } = await import('../services/account.service');
        const userAccounts = await accountService.getAccountsByUserId(user.id);
        if (!userAccounts.some(a => a.id === visitorAccountId)) {
          set.status = 403;
          return { success: false, message: 'Account does not belong to user' };
        }

        // Ensure relationship exists between visitor and owner
        const { relationshipService } = await import('../services/relationship.service');
        const relationship = await relationshipService.createRelationship(
          visitorAccountId,
          ownerAccountId
        );

        // Convert the visitor conversation
        const converted = await conversationService.convertVisitorConversation({
          visitorToken,
          ownerAccountId,
          visitorAccountId,
          relationshipId: relationship.id,
        });

        return {
          success: true,
          data: {
            conversation: converted,
            relationshipId: relationship.id,
          },
        };
      } catch (error: any) {
        console.error('[API] Error converting visitor conversation:', error);
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        visitorToken: t.String(),
        ownerAccountId: t.String(),
        visitorAccountId: t.String(),
      }),
      detail: {
        tags: ['Conversations'],
        summary: 'Convert anonymous visitor conversation to relationship-based',
        description: 'Links a visitor conversation to a real relationship when the visitor authenticates.',
      },
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
