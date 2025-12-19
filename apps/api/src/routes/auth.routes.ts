import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { authService } from '../services/auth.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  )
  .post(
    '/register',
    async ({ body, jwt, set }) => {
      try {
        const user = await authService.register(body);

        // Generate JWT token
        const token = await jwt.sign({
          userId: user.id,
          email: user.email,
        });

        // Get user accounts
        const { accountService } = await import('../services/account.service');
        const accounts = await accountService.getAccountsByUserId(user.id);

        return {
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
            accounts,
            token,
          },
        };
      } catch (error: any) {
        console.error('[Auth] Register error:', error);
        set.status = 400;

        const message =
          typeof error?.message === 'string' && error.message.trim().length > 0
            ? error.message
            : typeof error === 'string' && error.trim().length > 0
              ? error
              : 'Registration failed';

        return {
          success: false,
          message,
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
        name: t.String({ minLength: 2 }),
      }),
      detail: {
        tags: ['Auth'],
        summary: 'Register new user',
      },
    }
  )
  .post(
    '/login',
    async ({ body, jwt, set }) => {
      try {
        const result = await authService.login(body.email, body.password);

        // Generate JWT token
        const token = await jwt.sign({
          userId: result.user.id,
          email: result.user.email,
        });

        return {
          success: true,
          data: {
            user: result.user,
            accounts: result.accounts,
            token,
          },
        };
      } catch (error: any) {
        set.status = 401;
        return {
          success: false,
          message: error.message || 'Login failed',
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
      detail: {
        tags: ['Auth'],
        summary: 'Login user',
      },
    }
  )
  .post(
    '/logout',
    async () => {
      // With JWT, logout is handled client-side by removing the token
      return {
        success: true,
        message: 'Logged out successfully',
      };
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Logout user',
      },
    }
  )
  .post(
    '/forgot-password',
    async ({ body, set }) => {
      try {
        const token = await authService.requestPasswordReset(body.email);
        
        // Siempre devolver éxito para no revelar si el email existe
        if (token) {
          console.log(`[Auth] Password reset token generated for: ${body.email}`);
          console.log(`[Auth] Token: ${token}`);
          
          const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
          console.log(`[Auth] Reset link (DEV ONLY): ${resetLink}`);
          
          // TODO: Implement email service
        }
        
        return {
          success: true,
          message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
        };
      } catch (error: any) {
        console.error('[Auth] Forgot password error:', error);
        set.status = 500;
        return {
          success: false,
          message: 'Error processing request',
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
      }),
      detail: {
        tags: ['Auth'],
        summary: 'Request password reset',
      },
    }
  )
  .post(
    '/reset-password',
    async ({ body, set }) => {
      try {
        const success = await authService.resetPassword(body.token, body.password);
        
        if (!success) {
          set.status = 400;
          return {
            success: false,
            message: 'Invalid or expired token',
          };
        }
        
        return {
          success: true,
          message: 'Password reset successfully',
        };
      } catch (error: any) {
        console.error('[Auth] Reset password error:', error);
        set.status = 500;
        return {
          success: false,
          message: 'Error processing request',
        };
      }
    },
    {
      body: t.Object({
        token: t.String(),
        password: t.String({ minLength: 6 }),
      }),
      detail: {
        tags: ['Auth'],
        summary: 'Reset password with token',
      },
    }
  );
