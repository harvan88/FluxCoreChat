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
      return { user: null };
    }

    const token = auth.slice(7);

    try {
      const payload = await jwt.verify(token);

      if (!payload) {
        return { user: null };
      }

      return {
        user: {
          id: payload.userId as string,
          email: payload.email as string,
        },
      };
    } catch {
      return { user: null };
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
