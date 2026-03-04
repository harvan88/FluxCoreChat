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
import { internalAiRoutes } from './routes/internal-ai.routes';
import { contextRoutes } from './routes/context.routes';
import { appointmentsRoutes } from './routes/appointments.routes';
import { adaptersRoutes } from './routes/adapters.routes';
import { workspacesRoutes } from './routes/workspaces.routes';
import { automationRoutes } from './routes/automation.routes';
import { templatesRoutes } from './routes/templates.routes';
import { fluxiRoutes } from './routes/fluxcore/works.routes'; // WES-180
import { kernelStatusRoutes } from './routes/kernel-status.routes';
import { messageCore } from './core/message-core';
import { conversationService } from './services/conversation.service';

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
  .use(cors({
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  }))
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
          { name: 'Kernel Status', description: 'Kernel monitoring and status' },
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
  .use(internalAiRoutes)
  .use(contextRoutes)
  .use(appointmentsRoutes)
  .use(adaptersRoutes)
  .use(workspacesRoutes)
  .use(automationRoutes)
  .use(templatesRoutes)
  .use(fluxiRoutes) // WES-180
  .use(kernelStatusRoutes)
  .listen(PORT);

async function initializeFluxCore() {
  try {
    console.log('[Bootstrap] 🚀 Starting FluxCore v8.2 Initialization...');

    // 1. KERNEL (Physical Reality)
    const { kernelDispatcher } = await import('./core/kernel-dispatcher');
    kernelDispatcher.start();
    console.log('[Bootstrap] 1/4 Kernel Dispatcher started');

    // 2. PROJECTORS (Business Meaning)
    const { startProjectors } = await import('./core/kernel/projector-runner');
    startProjectors();
    console.log('[Bootstrap] 2/4 Projectors started');

    // 3. RUNTIME GATEWAY (Registry)
    const { runtimeGateway } = await import('./services/fluxcore/runtime-gateway.service');
    const { asistentesLocalRuntime } = await import('./services/fluxcore/runtimes/asistentes-local.runtime');

    runtimeGateway.register(asistentesLocalRuntime);
    // TODO H5: Register OpenAI Runtime
    console.log('[Bootstrap] 3/4 Runtime Gateway initialized');

    // 4. COGNITION WORKER (The Heartbeat)
    const { cognitionWorker } = await import('./workers/cognition-worker');
    cognitionWorker.start();
    console.log('[Bootstrap] 4/4 Cognition Worker activated');

    // ─── Legacy/Compatibility Layer ──────────────────────────────────────────
    const { wesScheduler } = await import('./services/wes-scheduler.service');
    await wesScheduler.init();

    const conversations = await conversationService.getAllConversations();
    conversations.forEach(conv => {
      messageCore.registerConversation(conv.id, conv.relationshipId);
    });

    console.log('[Bootstrap] ✨ FluxCore v8.2 fully operational');
  } catch (error) {
    console.error('[Bootstrap] ❌ Critical failure during FluxCore initialization:', error);
  }
}

initializeFluxCore();

logger.info('FluxCore API started', {
  hostname: app.server?.hostname,
  port: app.server?.port,
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
});

logger.info(`Swagger docs available at http://${app.server?.hostname}:${app.server?.port}/swagger`);

export type App = typeof app;
