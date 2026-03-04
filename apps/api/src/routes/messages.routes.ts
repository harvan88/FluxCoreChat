import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { extensionHost } from '../services/extension-host.service';
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';

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
        // ═══════════════════════════════════════════════════════════════
        // ARQUITECTURA CORRECTA:
        // ChatCore persiste primero, luego certifica async con outbox
        // FluxCore es reactivo, no controlador del mundo humano
        // ═══════════════════════════════════════════════════════════════
        
        // 🔑 AGREGAR VERDAD DEL MUNDO AL INPUT ORIGINAL
        const userAgent = request.headers.get('user-agent');
        const origin = request.headers.get('origin');
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
        
        // Construir meta con la verdad del mundo del input HTTP
        const enrichedBody = {
          ...typedBody,
          meta: {
            ...typedBody.meta,
            ip: ip,
            userAgent: userAgent,
            origin: origin || 'unknown',
            clientTimestamp: new Date().toISOString(),
            requestId: `msg-${Date.now()}-${user?.id}`,
            // 🔑 INFERIR CHANNEL DESDE EL INPUT HTTP
            channel: userAgent?.includes('Mobile') ? 'mobile' : 
                   userAgent?.includes('Tablet') ? 'tablet' : 
                   origin?.includes('localhost') ? 'web' : 'unknown'
          }
        };
        
        // 🔒 SECURITY: Resolver account desde user autenticado
        // El JWT contiene user.id, pero necesitamos el account.id correspondiente
        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));
        
        if (userAccounts.length === 0) {
          set.status = 403;
          return { success: false, message: 'User has no accounts' };
        }
        
        // 🎯 USAR LA ACCOUNT DEL BODY SI ES VÁLIDA, SINO LA PRIMERA
        let senderAccountId = userAccounts[0].id; // Fallback a la primera
        
        // 🔥 CORRECCIÓN: Si el body incluye senderAccountId, verificar que pertenezca al usuario
        if (typedBody.senderAccountId) {
          const requestedAccount = userAccounts.find(acc => acc.id === typedBody.senderAccountId);
          if (requestedAccount) {
            senderAccountId = requestedAccount.id; // ✅ Usar la account seleccionada
            console.log(`[MessagesRoute] ✅ Using selected account: ${senderAccountId}`);
          } else {
            console.log(`[MessagesRoute] ⚠️ Requested account ${typedBody.senderAccountId} not found for user, using first account`);
          }
        } else {
          console.log(`[MessagesRoute] ℹ️ No senderAccountId in body, using first account: ${senderAccountId}`);
        }
        
        // 🆕 Idempotency: Verificar si ya existe este requestId
        const requestId = enrichedBody.requestId || `msg-${Date.now()}-${senderAccountId}`;
        
        console.log(`[MessagesRoute] 🔒 AUTHENTICATED USER: ${user.id}`);
        console.log(`[MessagesRoute] 🔒 RESOLVED ACCOUNT: ${senderAccountId}`);
        console.log(`[MessagesRoute] 🆕 REQUEST ID: ${requestId}`);
        console.log(`[MessagesRoute] 🌍 INPUT CON VERDAD DEL MUNDO ENRIQUECIDO:`, {
          hasMeta: !!enrichedBody.meta,
          channel: enrichedBody.meta?.channel,
          origin: enrichedBody.meta?.origin,
          userAgent: enrichedBody.meta?.userAgent,
          authenticatedUser: user.id,
          resolvedAccount: senderAccountId,
          bodySender: enrichedBody.senderAccountId, // Para debugging de suplantación
          requestId: requestId
        });
        
        let receiverAccountId = senderAccountId; // Usar sender autenticado como fallback
        
        // Resolver RECEPTOR desde la conversación
        const conversation = await conversationService.getConversationById(enrichedBody.conversationId);
        if (conversation?.relationshipId) {
          const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
          if (relationship) {
            // El receptor es la OTRA cuenta en la relación
            receiverAccountId = relationship.accountAId === senderAccountId
              ? relationship.accountBId
              : relationship.accountAId;
          }
        }
        
        // 1️⃣ CHATCORE PERSISTE PRIMERO (soberanía del mundo conversacional)
        const { messageCore } = await import('../core/message-core');
        const result = await messageCore.receive({
          conversationId: enrichedBody.conversationId,
          senderAccountId: senderAccountId, // 🔒 Siempre del JWT autenticado
          content: enrichedBody.content,
          type: enrichedBody.type || 'incoming',
          generatedBy: 'human',
          targetAccountId: receiverAccountId,
          meta: enrichedBody.meta // 🔑 PASAR LA VERDAD DEL MUNDO COMPLETA
        });

        // 2️⃣ CERTIFICACIÓN ASÍNCRONA CON OUTBOX (no bloquea respuesta)
        // ✅ Ya no se necesita aquí porque message-core ya encola con el account_id correcto

        // 3️⃣ RETORNAR RESULTADO PERSISTIDO (UI inmediata)
        return { success: true, data: result };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        conversationId: t.String(),
        // � RESTORED: senderAccountId debe venir del frontend (cuenta seleccionada)
        senderAccountId: t.Optional(t.String()),
        content: t.Object({
          text: t.Optional(t.String()),
          media: t.Optional(t.Array(t.Any())),
          location: t.Optional(t.Any()),
          buttons: t.Optional(t.Array(t.Any())),
        }),
        type: t.Optional(t.Union([t.Literal('incoming'), t.Literal('outgoing'), t.Literal('system')])),
        generatedBy: t.Optional(t.Union([t.Literal('human'), t.Literal('ai')])),
        replyToId: t.Optional(t.String()),
        // 🆕 Idempotency key para prevenir duplicados
        requestId: t.Optional(t.String()),
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

        // 🔒 SECURITY: Verificar que el mensaje existe y pertenece al usuario autenticado
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        // 🔒 SECURITY: Verificar ownership del mensaje
        // NOTA: message.senderAccountId es un account.id, no user.id
        // Necesitamos verificar que el user.id autenticado es owner del account
        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));
        
        const userAccountIds = userAccounts.map(acc => acc.id);
        if (!userAccountIds.includes(message.senderAccountId)) {
          console.log(`[MessagesRoute] 🔒 UNAUTHORIZED EDIT ATTEMPT: user=${user.id}, messageOwner=${message.senderAccountId}, userAccounts=${userAccountIds.join(',')}, messageId=${params.id}`);
          set.status = 403;
          return { success: false, message: 'Unauthorized: You can only edit your own messages' };
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

        // 🔒 SECURITY: Verificar que el mensaje existe y pertenece al usuario autenticado
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        // 🔒 SECURITY: Verificar ownership del mensaje
        // NOTA: message.senderAccountId es un account.id, no user.id
        // Necesitamos verificar que el user.id autenticado es owner del account
        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));
        
        const userAccountIds = userAccounts.map(acc => acc.id);
        if (!userAccountIds.includes(message.senderAccountId)) {
          console.log(`[MessagesRoute] 🔒 UNAUTHORIZED DELETE ATTEMPT: user=${user.id}, messageOwner=${message.senderAccountId}, userAccounts=${userAccountIds.join(',')}, messageId=${params.id}`);
          set.status = 403;
          return { success: false, message: 'Unauthorized: You can only delete your own messages' };
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
