/**
 * Actors Routes - Gestión de actores y tokens públicos
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { jwt } from '@elysiajs/jwt';
import { db, actors } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const actorsRoutes = new Elysia({ prefix: '/actors' })
  .use(authMiddleware)
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  )
  .get(
    '/:id/public-token',
    async ({ params, set, jwt }) => {
      try {
        const { id } = params;

        // Verify actor exists
        const [actor] = await db
          .select()
          .from(actors)
          .where(eq(actors.id, id))
          .limit(1);

        if (!actor) {
          set.status = 404;
          return { success: false, message: 'Actor not found' };
        }

        // Verify actor is of type 'account' (public actors must be linked to accounts)
        if (actor.actorType !== 'account' || !actor.accountId) {
          set.status = 400;
          return { success: false, message: 'Only account actors can have public tokens' };
        }

        // Generate public token
        const publicToken = await jwt.sign({
          type: 'public_actor',
          actorId: actor.id,
          accountId: actor.accountId,
        });

        console.log(`[ActorsRoute] 🎭 Generated public token for actor: ${actor.id} (account: ${actor.accountId})`);

        return {
          success: true,
          data: {
            publicToken,
            actorId: actor.id,
            accountId: actor.accountId,
            actorType: actor.actorType,
            displayName: actor.displayName,
            permissions: ['send_messages', 'receive_messages'],
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          }
        };

      } catch (error: any) {
        console.error('[ActorsRoute] Error generating public token:', error);
        set.status = 500;
        return { success: false, message: 'Internal server error' };
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      detail: { 
        tags: ['Actors'], 
        summary: 'Get public token for actor',
        description: 'Generates a public JWT token that allows visitors to operate as this actor'
      }
    }
  )
  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        const { id } = params;

        const [actor] = await db
          .select()
          .from(actors)
          .where(eq(actors.id, id))
          .limit(1);

        if (!actor) {
          set.status = 404;
          return { success: false, message: 'Actor not found' };
        }

        return {
          success: true,
          data: {
            id: actor.id,
            actorType: actor.actorType,
            accountId: actor.accountId,
            displayName: actor.displayName,
            createdAt: actor.createdAt
          }
        };

      } catch (error: any) {
        console.error('[ActorsRoute] Error getting actor:', error);
        set.status = 500;
        return { success: false, message: 'Internal server error' };
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      detail: { 
        tags: ['Actors'], 
        summary: 'Get actor by ID',
        description: 'Retrieves actor information by ID'
      }
    }
  );
