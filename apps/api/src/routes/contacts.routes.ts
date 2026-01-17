import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { relationshipService } from '../services/relationship.service';
import { accountService } from '../services/account.service';
import { db, messages, conversations } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

export const contactsRoutes = new Elysia({ prefix: '/contacts' })
  .use(authMiddleware)
  .get(
    '/:contactId/interactions',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { contactId } = params;

        // Get user's accounts
        const userAccounts = await accountService.getAccountsByUserId(user.id);
        const userAccountIds = userAccounts.map(a => a.id);

        // Find relationship between user and contact
        const relationships = await relationshipService.getRelationshipsByAccountId(userAccountIds[0]);
        const relationship = relationships.find(
          r => r.accountAId === contactId || r.accountBId === contactId
        );

        if (!relationship) {
          set.status = 404;
          return { success: false, message: 'Relationship not found' };
        }

        // Get conversations for this relationship
        const convs = await db
          .select()
          .from(conversations)
          .where(eq(conversations.relationshipId, relationship.id))
          .limit(1);

        const interactions: Array<{
          id: string;
          type: 'message' | 'context_update' | 'status_change';
          timestamp: string;
          content: string;
          author?: string;
        }> = [];

        // Get recent messages
        if (convs.length > 0) {
          const recentMessages = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, convs[0].id))
            .orderBy(desc(messages.createdAt))
            .limit(10);

          for (const msg of recentMessages) {
            const senderAccount = await accountService.getAccountById(msg.senderAccountId);
            interactions.push({
              id: msg.id,
              type: 'message',
              timestamp: msg.createdAt.toISOString(),
              content: (msg.content as any)?.text || '[Mensaje sin texto]',
              author: senderAccount?.displayName,
            });
          }
        }

        // Get context updates from relationship
        const context = relationship.context as { entries?: Array<any> } | null;
        if (context?.entries) {
          for (const entry of context.entries.slice(0, 5)) {
            const authorAccount = await accountService.getAccountById(entry.author_account_id);
            interactions.push({
              id: `context-${entry.timestamp}`,
              type: 'context_update',
              timestamp: entry.timestamp,
              content: entry.content,
              author: authorAccount?.displayName,
            });
          }
        }

        // Sort by timestamp descending
        interactions.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return {
          success: true,
          data: {
            relationship,
            interactions: interactions.slice(0, 10),
          },
        };
      } catch (error: any) {
        console.error('Error fetching contact interactions:', error);
        set.status = 500;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({
        contactId: t.String(),
      }),
      detail: {
        tags: ['Contacts'],
        summary: 'Get contact interactions history',
      },
    }
  );
