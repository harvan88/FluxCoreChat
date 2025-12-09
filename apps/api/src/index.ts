import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { logger } from './utils/logger';
import { errorTracker, isOperationalError } from './middleware/error-tracking';

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth.routes';
import { accountsRoutes } from './routes/accounts.routes';
import { relationshipsRoutes } from './routes/relationships.routes';
import { conversationsRoutes } from './routes/conversations.routes';
import { messagesRoutes } from './routes/messages.routes';
import { extensionRoutes } from './routes/extensions.routes';
import { aiRoutes } from './routes/ai.routes';
import { contextRoutes } from './routes/context.routes';
import { appointmentsRoutes } from './routes/appointments.routes';
import { adaptersRoutes } from './routes/adapters.routes';
import { workspacesRoutes } from './routes/workspaces.routes';

const PORT = process.env.PORT || 3000;

const app = new Elysia()
  .onError(({ error, request }) => {
    const url = new URL(request.url);
    const severity = isOperationalError(error) ? 'warning' : 'error';
    
    errorTracker.capture(error, severity, {
      method: request.method,
      path: url.pathname,
    });

    const statusCode = (error as any).statusCode || 500;
    return {
      error: error.message,
      statusCode,
      code: (error as any).code,
    };
  })
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'FluxCore API',
          version: '0.2.0',
          description: 'API para FluxCore - Sistema de mensajería universal extensible',
        },
        tags: [
          { name: 'Health', description: 'Health check endpoints' },
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Accounts', description: 'Account management' },
          { name: 'Relationships', description: 'Relationship management' },
          { name: 'Conversations', description: 'Conversation management' },
          { name: 'Messages', description: 'Messaging endpoints' },
          { name: 'Extensions', description: 'Extension management' },
          { name: 'AI', description: 'AI assistant endpoints' },
          { name: 'Context', description: 'Relationship context management' },
          { name: 'Appointments', description: 'Appointment scheduling system' },
          { name: 'Adapters', description: 'Channel adapters (WhatsApp, etc.)' },
          { name: 'Workspaces', description: 'Collaborative workspaces' },
        ],
      },
    })
  )
  .use(healthRoutes)
  .use(authRoutes)
  .use(accountsRoutes)
  .use(relationshipsRoutes)
  .use(conversationsRoutes)
  .use(messagesRoutes)
  .use(extensionRoutes)
  .use(aiRoutes)
  .use(contextRoutes)
  .use(appointmentsRoutes)
  .use(adaptersRoutes)
  .use(workspacesRoutes)
  .listen(PORT);

logger.info('FluxCore API started', {
  hostname: app.server?.hostname,
  port: app.server?.port,
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
});

logger.info(`Swagger docs available at http://${app.server?.hostname}:${app.server?.port}/swagger`);

export type App = typeof app;
