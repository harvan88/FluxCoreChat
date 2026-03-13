import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db, accounts, conversations, messages, actors } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';
import { assetPolicyService } from '../services/asset-policy.service';
import { conversationService } from '../services/conversation.service';
import { getOrCreateAccountActorId } from '../utils/actor-resolver';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const publicProfileRoutes = new Elysia({ prefix: '/public/profiles' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  )
  .get(
    '/check-alias/:alias',
    async ({ params, set }) => {
      try {
        const raw = params.alias.trim().toLowerCase();

        // Validation: 3-30 chars, alphanumeric + hyphens/underscores, must start with letter
        const aliasRegex = /^[a-z][a-z0-9_-]{2,29}$/;
        if (!aliasRegex.test(raw)) {
          return {
            success: true,
            data: {
              alias: raw,
              available: false,
              reason: 'invalid_format',
              message: 'El alias debe tener 3-30 caracteres, empezar con letra y solo contener letras, números, guiones o guiones bajos.',
            },
          };
        }

        // Reserved words
        const reserved = ['admin', 'api', 'app', 'login', 'register', 'settings', 'help', 'support', 'meetgar', 'fluxcore', 'system', 'null', 'undefined', 'public', 'private'];
        if (reserved.includes(raw)) {
          return {
            success: true,
            data: { alias: raw, available: false, reason: 'reserved', message: 'Este alias está reservado.' },
          };
        }

        const existing = await db.query.accounts.findFirst({
          where: eq(accounts.alias, raw),
          columns: { id: true },
        });

        return {
          success: true,
          data: {
            alias: raw,
            available: !existing,
            reason: existing ? 'taken' : null,
            message: existing ? 'Este alias ya está en uso.' : null,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message || 'Internal server error' };
      }
    },
    {
      params: t.Object({ alias: t.String() }),
      detail: {
        tags: ['PublicProfile'],
        summary: 'Check alias availability',
        description: 'Checks if an alias is available, valid, and not reserved. No authentication required.',
      },
    }
  )
  .get(
    '/:alias/session',
    async ({ params, query, set, jwt }) => {
      try {
        const visitorToken = query.visitorToken?.trim();
        if (!visitorToken) {
          set.status = 400;
          return { success: false, message: 'visitorToken required' };
        }

        const account = await db.query.accounts.findFirst({
          where: eq(accounts.alias, params.alias),
        });

        if (!account) {
          set.status = 404;
          return { success: false, message: 'Profile not found' };
        }

        const ownerActorId = await getOrCreateAccountActorId(account.id, account.displayName || account.alias || undefined);

        const [existingVisitorActor] = await db
          .select({ id: actors.id })
          .from(actors)
          .where(
            and(
              eq(actors.actorType, 'visitor'),
              eq(actors.externalKey, visitorToken),
              eq(actors.tenantId, account.id)
            )
          )
          .limit(1);

        let visitorActorId = existingVisitorActor?.id;
        if (!visitorActorId) {
          const [visitorActor] = await db
            .insert(actors)
            .values({
              actorType: 'visitor',
              externalKey: visitorToken,
              tenantId: account.id,
              displayName: `Visitor ${visitorToken.slice(0, 8)}`,
            })
            .returning({ id: actors.id });

          visitorActorId = visitorActor.id;
        }

        const conversation = await conversationService.ensureConversation({
          visitorToken,
          ownerAccountId: account.id,
          channel: 'webchat',
        });

        const publicToken = await jwt.sign({
          type: 'public_profile',
          ownerAccountId: account.id,
          visitorToken,
          visitorActorId,
        });

        return {
          success: true,
          data: {
            conversationId: conversation.id,
            ownerAccountId: account.id,
            ownerActorId,
            visitorActorId,
            visitorToken,
            publicToken,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message || 'Internal server error' };
      }
    },
    {
      params: t.Object({ alias: t.String() }),
      query: t.Object({ visitorToken: t.String() }),
      detail: {
        tags: ['PublicProfile'],
        summary: 'Create or resume public profile session',
        description: 'Resolves the visitor actor, conversation and temporary JWT for a public profile chat session.',
      },
    }
  )
  .get(
    '/:alias',
    async ({ params, set }) => {
      try {
        const account = await db.query.accounts.findFirst({
          where: eq(accounts.alias, params.alias),
        });

        if (!account) {
          set.status = 404;
          return { success: false, message: 'Profile not found' };
        }

        const profile = (account.profile && typeof account.profile === 'object')
          ? account.profile as Record<string, any>
          : {};

        let avatarUrl: string | null = null;

        if (account.avatarAssetId) {
          try {
            const signed = await assetPolicyService.signAsset({
              assetId: account.avatarAssetId,
              actorId: 'system-public-profile',
              actorType: 'system',
              context: { action: 'preview', channel: 'web' },
            });
            if (signed) {
              avatarUrl = signed.url;
            }
          } catch {
            // Avatar signing failed — not critical, continue without it
          }
        }

        if (!avatarUrl && profile.avatarUrl) {
          avatarUrl = profile.avatarUrl as string;
        }

        const actorId = await getOrCreateAccountActorId(account.id, account.displayName || account.alias || undefined);

        return {
          success: true,
          data: {
            id: account.id,
            displayName: account.displayName,
            alias: account.alias,
            accountType: account.accountType,
            bio: (profile.bio as string) || null,
            avatarUrl,
            actorId,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message || 'Internal server error' };
      }
    },
    {
      params: t.Object({ alias: t.String() }),
      detail: {
        tags: ['PublicProfile'],
        summary: 'Get public profile by alias',
        description: 'Returns public profile information for a given alias. No authentication required.',
      },
    }
  )
  .get(
    '/:alias/conversation',
    async ({ params, query, set }) => {
      try {
        const { visitorToken } = query;
        if (!visitorToken) {
          set.status = 400;
          return { success: false, message: 'visitorToken required' };
        }

        // Find account by alias
        const account = await db.query.accounts.findFirst({
          where: eq(accounts.alias, params.alias),
          columns: { id: true },
        });

        if (!account) {
          set.status = 404;
          return { success: false, message: 'Profile not found' };
        }

        // Find visitor conversation
        const [conversation] = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.visitorToken, visitorToken),
              eq(conversations.ownerAccountId, account.id),
              eq(conversations.channel, 'webchat')
            )
          )
          .limit(1);

        if (!conversation) {
          return { success: true, data: { conversation: null, messages: [] } };
        }

        // Load messages
        const conversationMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(100);

        // Reverse to chronological order and map to public format
        const publicMessages = conversationMessages.reverse().map((msg) => {
          const content = msg.content as any;
          const text = typeof content === 'string' ? content : content?.text || '';
          return {
            id: msg.id,
            text,
            sender: msg.type === 'incoming' ? 'visitor' : 'account',
            timestamp: msg.createdAt.toISOString(),
            generatedBy: msg.generatedBy,
          };
        });

        return {
          success: true,
          data: {
            conversationId: conversation.id,
            messages: publicMessages,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, message: error.message || 'Internal server error' };
      }
    },
    {
      params: t.Object({ alias: t.String() }),
      query: t.Object({
        visitorToken: t.Optional(t.String()),
      }),
      detail: {
        tags: ['PublicProfile'],
        summary: 'Get visitor conversation history',
        description: 'Returns conversation and messages for a visitor token. No authentication required.',
      },
    }
  );
