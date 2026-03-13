import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { extensionHost } from '../services/extension-host.service';
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';
import { resolveActorId, resolveAccountId, resolveActorIds } from '../utils/actor-resolver';

export const messagesRoutes = new Elysia({ prefix: '/messages' })
  .use(authMiddleware)
  .post(
    '/',
    async ({ user, publicActor, publicProfile, body, set, request }) => {
      const typedBody: any = body as any;
      console.log(`[MessagesRoute] 📥 Incoming POST /messages request:`, {
        type: user ? 'authenticated' : (publicProfile ? 'public_profile' : (publicActor ? 'public_actor' : 'none')),
        hasText: !!typedBody.content?.text,
        mediaCount: typedBody.content?.media?.length || 0
      });

      // Allow either authenticated user OR public actor
      if (!user && !publicActor && !publicProfile) {
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
            requestId: `msg-${Date.now()}-${user?.id || publicActor?.actorId}`,
            // 🔑 INFERIR CHANNEL DESDE EL INPUT HTTP
            channel: userAgent?.includes('Mobile') ? 'mobile' : 
                   userAgent?.includes('Tablet') ? 'tablet' : 
                   origin?.includes('localhost') ? 'web' : 'unknown'
          }
        };
        
        let senderAccountId: string;
        let fromActorId: string;
        let receiverAccountId: string;
        let messageType: 'incoming' | 'outgoing' | 'system' = (enrichedBody.type || 'incoming') as 'incoming' | 'outgoing' | 'system';

        const conversation = await conversationService.getConversationById(enrichedBody.conversationId);
        if (!conversation) {
          set.status = 404;
          return { success: false, message: 'Conversation not found' };
        }

        if (publicProfile) {
          if (conversation.visitorToken !== publicProfile.visitorToken || conversation.ownerAccountId !== publicProfile.ownerAccountId) {
            set.status = 403;
            return { success: false, message: 'Unauthorized for this conversation' };
          }

          senderAccountId = publicProfile.visitorActorId;
          fromActorId = publicProfile.visitorActorId;
          receiverAccountId = publicProfile.ownerAccountId;
          messageType = 'incoming';

          console.log(`[MessagesRoute] 🌐 PUBLIC PROFILE visitor=${publicProfile.visitorActorId} owner=${publicProfile.ownerAccountId}`);
        } else if (publicActor) {
          // 🎭 PUBLIC ACTOR MODE: Visitor operating as public actor
          senderAccountId = publicActor.accountId;
          fromActorId = publicActor.actorId;
          receiverAccountId = publicActor.accountId;
          
          console.log(`[MessagesRoute] 🎭 PUBLIC ACTOR: ${publicActor.actorId} operating as account ${publicActor.accountId}`);
        } else {
          // 🔒 AUTHENTICATED USER MODE: Regular user
          // SECURITY: Resolver account desde user autenticado
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
          senderAccountId = userAccounts[0].id; // Fallback a la primera
          
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
          
          // Resolve actor for authenticated user
          fromActorId = await resolveActorId(senderAccountId) || '';
          receiverAccountId = senderAccountId;
          
          console.log(`[MessagesRoute] 🔒 AUTHENTICATED USER: ${user.id}`);
        }
        
        // 🆕 Idempotency: Verificar si ya existe este requestId
        const requestId = enrichedBody.requestId || `msg-${Date.now()}-${senderAccountId}`;
        
        console.log(`[MessagesRoute] 🔒 RESOLVED ACCOUNT: ${senderAccountId}`);
        console.log(`[MessagesRoute] 🔒 RESOLVED ACTOR: ${fromActorId}`);
        console.log(`[MessagesRoute] 🆕 REQUEST ID: ${requestId}`);
        console.log(`[MessagesRoute] 🌍 INPUT CON VERDAD DEL MUNDO ENRIQUECIDO:`, {
          hasMeta: !!enrichedBody.meta,
          channel: enrichedBody.meta?.channel,
          origin: enrichedBody.meta?.origin,
          userAgent: enrichedBody.meta?.userAgent,
          authenticatedUser: user?.id,
          publicActor: publicActor?.actorId,
          resolvedAccount: senderAccountId,
          requestId: requestId
        });
        
        if (!publicProfile && conversation?.relationshipId) {
          const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
          if (relationship) {
            // El receptor es la OTRA cuenta en la relación (resolved via actor model)
            const otherActorId = relationship.actorAId === fromActorId
              ? relationship.actorBId
              : relationship.actorAId;
            const resolved = await resolveAccountId(otherActorId);
            if (resolved) receiverAccountId = resolved;
          }
        }
        
        // 1️⃣ CHATCORE PERSISTE PRIMERO (soberanía del mundo conversacional)
        console.log(`[MessagesRoute] 📤 Sending to messageCore:`, {
          conversationId: enrichedBody.conversationId,
          senderAccountId: senderAccountId,
          fromActorId: fromActorId,
          type: messageType,
          generatedBy: 'human',
          targetAccountId: receiverAccountId,
          content: enrichedBody.content.text?.substring(0, 50)
        });
        
        const { messageCore } = await import('../core/message-core');
        const result = await messageCore.receive({
          conversationId: enrichedBody.conversationId,
          senderAccountId: senderAccountId,
          fromActorId: fromActorId || undefined,
          content: enrichedBody.content,
          type: messageType,
          generatedBy: 'human',
          targetAccountId: receiverAccountId,
          meta: enrichedBody.meta // 🔑 PASAR LA VERDAD DEL MUNDO COMPLETA
        });

        console.log(`[MessagesRoute] ✅ messageCore.receive result:`, {
          messageId: result.messageId,
          success: true
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
      isAuthenticated: false,
      body: t.Object({
        conversationId: t.String(),
        // RESTORED: senderAccountId debe venir del frontend (cuenta seleccionada)
        senderAccountId: t.Optional(t.String()),
        // 🆕 fromActorId para el nuevo modelo de actores
        fromActorId: t.Optional(t.String()),
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
    '/',
    async ({ user, publicActor, publicProfile, query, set }) => {
      if (!user && !publicActor && !publicProfile) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { db, accounts } = await import('@fluxcore/db');
        const { eq } = await import('drizzle-orm');
        const { messageService } = await import('../services/message.service');

        const conversationId = query.conversationId as string;
        const limit = parseInt(query.limit as string) || 50;

        if (!conversationId) {
          set.status = 400;
          return { success: false, message: 'conversationId required' };
        }

        const conversation = await conversationService.getConversationById(conversationId);
        if (!conversation) {
          set.status = 404;
          return { success: false, message: 'Conversation not found' };
        }

        if (publicProfile) {
          if (conversation.visitorToken !== publicProfile.visitorToken || conversation.ownerAccountId !== publicProfile.ownerAccountId) {
            set.status = 403;
            return { success: false, message: 'Unauthorized for this conversation' };
          }
        } else if (user) {
          const userAccounts = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.ownerUserId, user.id));

          const userAccountIds = userAccounts.map(acc => acc.id);
          let allowed = conversation.ownerAccountId ? userAccountIds.includes(conversation.ownerAccountId) : false;

          if (!allowed && conversation.relationshipId) {
            const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
            if (relationship) {
              const actorMap = await resolveActorIds(userAccountIds);
              const userActorIds = [...actorMap.values()];
              allowed = userActorIds.includes(relationship.actorAId) || userActorIds.includes(relationship.actorBId);
            }
          }

          if (!allowed) {
            set.status = 403;
            return { success: false, message: 'Unauthorized for this conversation' };
          }
        }

        // Resolve viewer actor for visibility filtering
        let viewerActorId: string | undefined;
        
        if (publicProfile) {
          viewerActorId = publicProfile.visitorActorId;
        } else if (user) {
          const userAccounts = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.ownerUserId, user.id));

          const userAccountIds = userAccounts.map(acc => acc.id);
          const actorMap = await resolveActorIds(userAccountIds);
          viewerActorId = actorMap.get(userAccountIds[0]); // Use first account's actor
        }

        const messagesList = await messageService.getMessagesByConversationId(conversationId, limit, undefined, viewerActorId);

        return { success: true, data: messagesList };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: false,
      query: t.Object({
        conversationId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: { tags: ['Messages'], summary: 'Get messages list' },
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
  .delete(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');
        const { db, accounts } = await import('@fluxcore/db');
        const { eq } = await import('drizzle-orm');

        const scope = (query.scope === 'all' ? 'all' : 'self') as 'self' | 'all';

        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));

        const userAccountIds = userAccounts.map(acc => acc.id);

        // Resolve the active account: prefer query.accountId (from UI), fallback to first
        let activeAccountId = userAccountIds[0];
        if (query.accountId) {
          if (!userAccountIds.includes(query.accountId)) {
            set.status = 403;
            return { success: false, message: 'AccountId does not belong to user' };
          }
          activeAccountId = query.accountId;
        }

        // Para scope 'all' (redacción): solo el emisor puede redactar
        if (scope === 'all' && !userAccountIds.includes(message.senderAccountId)) {
          set.status = 403;
          return { success: false, message: 'Only the sender can redact a message for all' };
        }

        // Resolver actorId del requester (necesario para scope 'self')
        let requesterActorId: string | undefined;
        if (scope === 'self') {
          const { resolveActorId } = await import('../utils/actor-resolver');
          requesterActorId = await resolveActorId(activeAccountId) || undefined;

          if (!requesterActorId) {
            set.status = 400;
            return { success: false, message: 'Could not resolve actor for current user' };
          }
        }

        await messageService.deleteMessage(
          params.id,
          activeAccountId,
          scope,
          requesterActorId,
        );

        return {
          success: true,
          data: {
            scope,
            action: scope === 'all' ? 'redacted' : 'hidden',
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        scope: t.Optional(t.Union([t.Literal('self'), t.Literal('all')])),
        accountId: t.Optional(t.String()),
      }),
      detail: { tags: ['Messages'], summary: 'Delete message (redact for all or hide for self)' },
    }
  )
  .delete(
    '/bulk',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');
        const { db, accounts } = await import('@fluxcore/db');
        const { eq, inArray } = await import('drizzle-orm');

        const { messageIds, scope = 'self', accountId: bodyAccountId } = body as { 
          messageIds: string[]; 
          scope?: 'self' | 'all';
          accountId?: string;
        };

        if (!messageIds || messageIds.length === 0) {
          set.status = 400;
          return { success: false, message: 'No message IDs provided' };
        }

        if (messageIds.length > 100) {
          set.status = 400;
          return { success: false, message: 'Too many messages (max 100)' };
        }

        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));

        const userAccountIds = userAccounts.map(acc => acc.id);

        // Resolve the active account: prefer bodyAccountId (from UI), fallback to first
        let senderAccountId = userAccountIds[0];
        if (bodyAccountId) {
          if (!userAccountIds.includes(bodyAccountId)) {
            set.status = 403;
            return { success: false, message: 'AccountId does not belong to user' };
          }
          senderAccountId = bodyAccountId;
        }

        // Get all messages to verify permissions
        const messages = await messageService.getMessagesByIds(messageIds);
        if (messages.length === 0) {
          set.status = 404;
          return { success: false, message: 'No messages found' };
        }

        // Verify permissions for each message
        for (const message of messages) {
          if (scope === 'all' && !userAccountIds.includes(message.senderAccountId)) {
            set.status = 403;
            return { 
              success: false, 
              message: 'Only the sender can redact a message for all' 
            };
          }
        }

        // Resolve actorId for scope 'self'
        let requesterActorId: string | undefined;
        if (scope === 'self') {
          const { resolveActorId } = await import('../utils/actor-resolver');
          requesterActorId = await resolveActorId(senderAccountId) || undefined;

          if (!requesterActorId) {
            set.status = 400;
            return { 
              success: false, 
              message: 'Could not resolve actor for current user' 
            };
          }
        }

        // Delete all messages
        const results = await Promise.allSettled(
          messageIds.map(id => 
            messageService.deleteMessage(id, senderAccountId, scope, requesterActorId)
          )
        );

        const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        if (failed.length > 0) {
          console.error('Bulk delete partial failure:', failed.map(f => f.reason));
          return {
            success: true,
            data: {
              deleted: messageIds.length - failed.length,
              failed: failed.length,
              scope,
              action: scope === 'all' ? 'redacted' : 'hidden',
            },
          };
        }

        return {
          success: true,
          data: {
            deleted: messageIds.length,
            failed: 0,
            scope,
            action: scope === 'all' ? 'redacted' : 'hidden',
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        messageIds: t.Array(t.String()),
        scope: t.Optional(t.Union([t.Literal('self'), t.Literal('all')])),
        accountId: t.Optional(t.String()),
      }),
      detail: { 
        tags: ['Messages'], 
        summary: 'Delete multiple messages (redact for all or hide for self)' 
      },
    }
  );
