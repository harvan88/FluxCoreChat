import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authMiddleware = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  )
  .derive(async ({ jwt, headers }) => {
    const auth = headers.authorization;

    if (!auth || !auth.startsWith('Bearer ')) {
      return { user: null, publicActor: null, publicProfile: null };
    }

    const token = auth.slice(7);

    try {
      const payload = await jwt.verify(token);

      if (!payload) {
        return { user: null, publicActor: null, publicProfile: null };
      }

      // Check if it's a public actor token
      if (payload.type === 'public_actor') {
        return {
          user: null,
          publicProfile: null,
          publicActor: {
            actorId: payload.actorId as string,
            accountId: payload.accountId as string,
            permissions: payload.permissions || ['send_messages', 'receive_messages']
          }
        };
      }

      if (payload.type === 'public_profile') {
        return {
          user: null,
          publicActor: null,
          publicProfile: {
            ownerAccountId: payload.ownerAccountId as string,
            visitorToken: payload.visitorToken as string,
            visitorActorId: payload.visitorActorId as string,
            permissions: payload.permissions || ['send_messages', 'read_messages']
          }
        };
      }

      // Regular user authentication
      return {
        user: {
          id: payload.userId as string,
          email: payload.email as string,
        },
        publicProfile: null,
        publicActor: null,
      };
    } catch {
      return { user: null, publicActor: null, publicProfile: null };
    }
  })
  .macro(({ onBeforeHandle }) => ({
    isAuthenticated(enabled: boolean) {
      if (!enabled) return;

      onBeforeHandle(({ user, set }) => {
        if (!user) {
          set.status = 401;
          return {
            success: false,
            message: 'Unauthorized',
          };
        }

        return;
      });
    },
  }));
