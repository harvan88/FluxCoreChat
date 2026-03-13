/**
 * FluxCore API Server
 * 
 * Servidor híbrido que combina:
 * - Elysia para HTTP REST API
 * - Bun nativo para WebSocket
 * 
 * Esto evita problemas de compatibilidad con @elysiajs/websocket
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import * as dns from 'node:dns';
import { eq } from 'drizzle-orm';
import type { Server } from 'bun';

// Definir tipo para datos del WebSocket
interface WebSocketData {
  ip?: string;
  userAgent?: string;
  requestId?: string | null;
  accountId?: string | null;
  userId?: string | null;
}

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth.routes';
import { accountsRoutes } from './routes/accounts.routes';
import { relationshipsRoutes } from './routes/relationships.routes';
import { messagesRoutes } from './routes/messages.routes';
import { assetsRoutes } from './routes/assets.routes';
import { accountAvatarRoutes } from './routes/account-avatar.routes';
import { conversationsRoutes } from './routes/conversations.routes';
import { contactsRoutes } from './routes/contacts.routes';
import { automationRoutes } from './routes/automation.routes';
import { adaptersRoutes } from './routes/adapters.routes';
import { extensionRoutes } from './routes/extensions.routes';
import { aiRoutes } from './routes/ai.routes';
import { internalAiRoutes } from './routes/internal-ai.routes';
import { creditsRoutes } from './routes/credits.routes';
import { internalCreditsRoutes } from './routes/internal-credits.routes';
import { systemAdminRoutes } from './routes/system-admin.routes';
import { accountDeletionAdminRoutes } from './routes/account-deletion.admin.routes';
import { accountDeletionPublicRoutes } from './routes/account-deletion.public.routes';
import { websiteRoutes } from './routes/website.routes';
import { fluxcoreRoutes } from './routes/fluxcore.routes';
import { fluxcoreRuntimeRoutes } from './routes/fluxcore-runtime.routes';
import { fluxcoreAgentRoutes } from './routes/fluxcore-agents.routes';
import { kernelSessionsRoutes } from './routes/kernel-sessions.routes';
import { testRoutes } from './routes/test.routes';
import { testChatCoreRoutes } from './routes/test-chatcore.routes';
import { assetRelationsRoutes } from './routes/asset-relations.routes';
import { templatesRoutes } from './routes/templates.routes';
import { ragConfigRoutes } from './routes/rag-config.routes';
import { publicProfileRoutes } from './routes/public-profile.routes';
import { actorsRoutes } from './routes/actors.routes';
import { handleWSMessage, handleWSOpen, handleWSClose } from './websocket/ws-handler';
import { automationScheduler } from './services/automation-scheduler.service';
import { wesScheduler } from './services/wes-scheduler.service';
import { mediaOrchestrator } from './services/media-orchestrator.service';
import { messageDispatchService } from './services/message-dispatch.service';
import { accountDeletionWorker } from './workers/account-deletion.worker';
import { featureFlags } from './config/feature-flags';
import { startAccountDeletionQueue, stopAccountDeletionQueue } from './workers/account-deletion.queue';
import { closeRedisConnection } from './queues/redis-connection';
import { bootstrapKernel } from './bootstrap/kernel.bootstrap';
import { kernelDispatcher } from './core/kernel-dispatcher';
import { startProjectors } from './core/kernel/projector-runner';
import { runtimeGateway } from './services/fluxcore/runtime-gateway.service';
import { asistentesLocalRuntime } from './services/fluxcore/runtimes/asistentes-local.runtime';
import { asistentesOpenAIRuntime } from './services/fluxcore/runtimes/asistentes-openai.runtime';
import { fluxiRuntime } from './services/fluxcore/runtimes/fluxi.runtime';
import { cognitionWorker } from './workers/cognition-worker';
import { chatCoreOutboxService } from './services/chatcore-outbox.service';
import * as path from 'path';
import * as fs from 'fs';

const rootEnvPath = path.resolve(__dirname, '../../../.env');

function parseDotenv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) out[key] = value;
  }
  return out;
}

function isPlaceholderEnvValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v === 'your-groq-api-key' ||
    v === 'your-openai-api-key' ||
    v.startsWith('your-') ||
    v.includes('change-in-production')
  );
}

async function resolveWebSocketIdentityFromToken(token: string, source: string): Promise<{ accountId: string | null; userId: string | null }> {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    if (payload.type === 'public_profile' && typeof payload.ownerAccountId === 'string') {
      console.log(`[WebSocket] ✅ AccountId resolved from public_profile token (${source}):`, payload.ownerAccountId);
      return { accountId: payload.ownerAccountId, userId: null };
    }

    const userId = payload.userId || payload.sub;
    console.log(`[WebSocket] 🎯 UserId from token (${source}):`, userId);

    if (!userId) {
      return { accountId: null, userId: null };
    }

    const { db, accounts } = await import('@fluxcore/db');
    const userAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.ownerUserId, userId))
      .limit(1);

    if (userAccounts.length > 0) {
      console.log(`[WebSocket] ✅ AccountId resolved for user (${source}):`, userAccounts[0].id);
      return { accountId: userAccounts[0].id, userId };
    }

    console.log(`[WebSocket] ⚠️ No accounts found for user (${source}):`, userId);
    return { accountId: null, userId };
  } catch (error) {
    console.error(`[WebSocket] ❌ Error decoding token (${source}):`, error);
    return { accountId: null, userId: null };
  }
}

if (fs.existsSync(rootEnvPath)) {
  try {
    const parsed = parseDotenv(fs.readFileSync(rootEnvPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      const current = process.env[key];
      if (typeof current !== 'string' || current.length === 0 || isPlaceholderEnvValue(current)) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore
  }
}

const PORT = process.env.PORT || 3000;

// Diagnóstico de variables de entorno para AI
console.log('🔑 Environment check:');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `exists (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 'NOT SET');
console.log('   GROQ_API_KEY:', process.env.GROQ_API_KEY ? `exists (${process.env.GROQ_API_KEY.substring(0, 10)}...)` : 'NOT SET');

// Force IPv4 if needed for debugging
const HOST = process.env.HOST || '0.0.0.0';
console.log(`🔧 Server Configuration: HOST=${HOST}, PORT=${PORT}`);

const dnsOrder = process.env.FLUXCORE_DNS_ORDER;
if ((process.env.NODE_ENV || 'development') !== 'production' && dnsOrder === 'ipv4first') {
  try {
    dns.setDefaultResultOrder('ipv4first');
    console.log('🔧 DNS result order set to ipv4first (dev)');
  } catch {
    // ignore
  }
}

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ''));

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');

// Crear app Elysia para HTTP
const elysiaApp = new Elysia()
  .use(
    cors({
      origin: (requestOrigin) => {
        if (!requestOrigin) {
          return true;
        }

        if (typeof requestOrigin !== 'string') {
          return true;
        }

        const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

        if (configuredOrigins.length === 0) {
          return true;
        }

        return configuredOrigins.includes(normalizedRequestOrigin);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id', 'x-admin-scope', 'x-account-id'],
      credentials: true,
      maxAge: 60 * 60 * 24,
    })
  )
  .derive(({ request }) => {
    // Kernel context: extract headers as source of truth for all routes
    const headerAccountId = request.headers.get('x-account-id') || request.headers.get('x-accountid');
    const headerActorId = request.headers.get('x-user-id') || request.headers.get('x-actor-id');
    
    return {
      kernelContext: {
        accountId: headerAccountId,
        actorId: headerActorId,
      }
    };
  })
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
          { name: 'Contacts', description: 'Contact interactions and details' },
        ],
      },
    })
  )
  .use(healthRoutes)
  .use(authRoutes)
  .use(accountsRoutes)
  .use(accountAvatarRoutes)
  .use(relationshipsRoutes)
  .use(conversationsRoutes)
  .use(messagesRoutes)
  .use(actorsRoutes)
  .use(contactsRoutes)
  .use(automationRoutes)
  .use(adaptersRoutes)
  .use(extensionRoutes)
  .use(aiRoutes)
  .use(internalAiRoutes)
  .use(creditsRoutes)
  .use(internalCreditsRoutes)
  .use(accountDeletionAdminRoutes)
  .use(accountDeletionPublicRoutes)
  .use(systemAdminRoutes)
  .use(websiteRoutes)
  .use(fluxcoreRuntimeRoutes)
  .use(fluxcoreRoutes)
  .use(kernelSessionsRoutes)
  .group('/fluxcore', (app) => app.use(fluxcoreAgentRoutes))
  .use(testRoutes)
  .use(testChatCoreRoutes)
  .use(assetsRoutes)
  .use(assetRelationsRoutes)
  .use(templatesRoutes)
  .use(ragConfigRoutes)
  .use(publicProfileRoutes);

// Servidor híbrido: HTTP (Elysia) + WebSocket (Bun nativo)
let server: Server<WebSocketData>;
try {
  server = Bun.serve({
    hostname: HOST,
    port: PORT,

    // Handler para HTTP - delega a Elysia
    fetch: async (req: Request, server: Server<WebSocketData>) => {
      // Upgrade a WebSocket si es request de WS
      const url = new URL(req.url);
      if (url.pathname === '/ws') {
        console.log('[WebSocket] Upgrade request received');
        console.log('[WebSocket] Headers:', Object.fromEntries(req.headers.entries()));

        // Extraer accountId + userId desde token JWT
        const authHeader = req.headers.get('authorization');
        let accountId: string | null = null;
        let userId: string | null = null;
        
        // Priorizar accountId seleccionada del frontend
        const selectedAccountId = url.searchParams.get('accountId');
        
        // Resolve identity from token (header or query param)
        const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        const tokenFromQuery = url.searchParams.get('token');
        const token = tokenFromHeader || tokenFromQuery;
        
        if (token) {
          const identity = await resolveWebSocketIdentityFromToken(token, tokenFromHeader ? 'header' : 'query');
          userId = identity.userId;
          accountId = selectedAccountId || identity.accountId;
        } else {
          accountId = selectedAccountId;
          console.log('[WebSocket] ⚠️ No token found in header or query params');
        }
        
        if (selectedAccountId) {
          console.log('[WebSocket] 🎯 Using selected accountId from frontend:', selectedAccountId);
        }

        const success = server.upgrade(req, {
          data: {
            ip: req.headers.get('x-forwarded-for') || server.requestIP(req)?.address,
            userAgent: req.headers.get('user-agent'),
            requestId: `ws-${Date.now()}-${accountId || 'anonymous'}`,
            accountId: accountId,
            userId: userId,
          }
        });

        console.log('[WebSocket] Upgrade result:', success);
        if (success) {
          console.log('[WebSocket] ✅ Upgrade successful, returning undefined');
          return; // Must return undefined (or nothing) for successful upgrade
        }
        console.error('[WebSocket] ❌ Upgrade failed');
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      // Serve uploaded files statically
      if (url.pathname.startsWith('/uploads/')) {
        const relativePath = url.pathname.replace(/^\/+/, '');
        if (relativePath.includes('..')) {
          return new Response('Invalid path', { status: 400 });
        }

        let filePath = path.join(process.cwd(), relativePath);
        if (!fs.existsSync(filePath)) {
          const fallbackPath = path.join(process.cwd(), 'apps', 'api', relativePath);
          if (fs.existsSync(fallbackPath)) {
            filePath = fallbackPath;
          }
        }

        if (!fs.existsSync(filePath)) {
          return new Response('Not Found', { status: 404 });
        }

        const file = Bun.file(filePath);
        const headers: Record<string, string> = {};
        if (file.type) {
          headers['Content-Type'] = file.type;
        }

        return new Response(file, { headers });
      }

      // Serve public websites (Karen extension)
      // Check if path matches /{alias} or /{alias}/*
      const publicSiteMatch = url.pathname.match(/^\/([a-zA-Z0-9_-]+)(\/.*)?$/);
      if (publicSiteMatch) {
        const alias = publicSiteMatch[1];
        const subPath = publicSiteMatch[2] || '/';

        // Skip API routes and known paths
        const reservedPaths = ['api', 'auth', 'accounts', 'relationships', 'conversations',
          'messages', 'contacts', 'automation', 'adapters', 'extensions', 'ai', 'internal', 'websites',
          'uploads', 'ws', 'swagger', 'health', 'app', 'fluxcore', 'works'];

        if (!reservedPaths.includes(alias)) {
          const sitesDir = path.join(process.cwd(), 'public', 'sites', alias);

          // Determine file path
          let filePath: string;
          if (subPath === '/' || subPath === '') {
            filePath = path.join(sitesDir, 'index.html');
          } else {
            // Try exact path first, then path/index.html
            const exactPath = path.join(sitesDir, subPath);
            const indexPath = path.join(sitesDir, subPath, 'index.html');

            if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) {
              filePath = exactPath;
            } else {
              filePath = indexPath;
            }
          }

          // Check if file exists
          if (fs.existsSync(filePath)) {
            const file = Bun.file(filePath);
            const contentType = filePath.endsWith('.html') ? 'text/html' :
              filePath.endsWith('.css') ? 'text/css' :
                filePath.endsWith('.js') ? 'application/javascript' :
                  filePath.endsWith('.xml') ? 'application/xml' :
                    'text/plain';

            return new Response(file, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
              },
            });
          }
        }
      }

      // Delegar a Elysia para HTTP
      return elysiaApp.handle(req);
    },

    // Handler para WebSocket
    websocket: {
      async message(ws, message) {
        await handleWSMessage(ws, message);
      },
      open(ws) {
        handleWSOpen(ws);
      },
      close(ws) {
        handleWSClose(ws);
      },
    },
  });
} catch {
  server = Bun.serve({
    hostname: '0.0.0.0',
    port: PORT,

    // Handler para HTTP - delega a Elysia
    fetch: async (req: Request, server: Server<WebSocketData>) => {
      // Upgrade a WebSocket si es request de WS
      const url = new URL(req.url);
      if (url.pathname === '/ws') {
        console.log('[WebSocket] Upgrade request received (fallback)');
        console.log('[WebSocket] Headers:', Object.fromEntries(req.headers.entries()));
        
        const authHeader = req.headers.get('authorization');
        let accountId: string | null = null;
        let userId: string | null = null;
        
        const selectedAccountId = url.searchParams.get('accountId');
        const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        const tokenFromQuery = url.searchParams.get('token');
        const token = tokenFromHeader || tokenFromQuery;
        
        if (token) {
          const identity = await resolveWebSocketIdentityFromToken(token, tokenFromHeader ? 'fallback-header' : 'fallback-query');
          userId = identity.userId;
          accountId = selectedAccountId || identity.accountId;
        } else {
          accountId = selectedAccountId;
          console.log('[WebSocket] ⚠️ No token found in header or query params (fallback)');
        }
        
        const success = server.upgrade(req, {
          data: {
            ip: req.headers.get('x-forwarded-for') || server.requestIP(req)?.address,
            userAgent: req.headers.get('user-agent'),
            requestId: `ws-${Date.now()}-${accountId || 'anonymous'}`,
            accountId: accountId,
            userId: userId,
          }
        });
        console.log('[WebSocket] Upgrade result:', success);
        if (success) {
          console.log('[WebSocket] ✅ Upgrade successful, returning undefined');
          return; // Must return undefined (or nothing) for successful upgrade
        }
        console.error('[WebSocket] ❌ Upgrade failed');
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      // Serve uploaded files statically
      if (url.pathname.startsWith('/uploads/')) {
        const relativePath = url.pathname.replace(/^\/+/, '');
        if (relativePath.includes('..')) {
          return new Response('Invalid path', { status: 400 });
        }

        let filePath = path.join(process.cwd(), relativePath);
        if (!fs.existsSync(filePath)) {
          const fallbackPath = path.join(process.cwd(), 'apps', 'api', relativePath);
          if (fs.existsSync(fallbackPath)) {
            filePath = fallbackPath;
          }
        }

        if (!fs.existsSync(filePath)) {
          return new Response('Not Found', { status: 404 });
        }

        const file = Bun.file(filePath);
        const headers: Record<string, string> = {};
        if (file.type) {
          headers['Content-Type'] = file.type;
        }

        return new Response(file, { headers });
      }

      // Serve public websites (Karen extension)
      // Check if path matches /{alias} or /{alias}/*
      const publicSiteMatch = url.pathname.match(/^\/([a-zA-Z0-9_-]+)(\/.*)?$/);
      if (publicSiteMatch) {
        const alias = publicSiteMatch[1];
        const subPath = publicSiteMatch[2] || '/';

        // Skip API routes and known paths
        const reservedPaths = ['api', 'auth', 'accounts', 'relationships', 'conversations',
          'messages', 'contacts', 'automation', 'adapters', 'extensions', 'ai', 'internal', 'websites',
          'uploads', 'ws', 'swagger', 'health', 'app', 'fluxcore', 'works'];

        if (!reservedPaths.includes(alias)) {
          const sitesDir = path.join(process.cwd(), 'public', 'sites', alias);

          // Determine file path
          let filePath: string;
          if (subPath === '/' || subPath === '') {
            filePath = path.join(sitesDir, 'index.html');
          } else {
            // Try exact path first, then path/index.html
            const exactPath = path.join(sitesDir, subPath);
            const indexPath = path.join(sitesDir, subPath, 'index.html');

            if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) {
              filePath = exactPath;
            } else {
              filePath = indexPath;
            }
          }

          // Check if file exists
          if (fs.existsSync(filePath)) {
            const file = Bun.file(filePath);
            const contentType = filePath.endsWith('.html') ? 'text/html' :
              filePath.endsWith('.css') ? 'text/css' :
                filePath.endsWith('.js') ? 'application/javascript' :
                  filePath.endsWith('.xml') ? 'application/xml' :
                    'text/plain';

            return new Response(file, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
              },
            });
          }
        }
      }

      // Delegar a Elysia para HTTP
      return elysiaApp.handle(req);
    },

    // Handler para WebSocket
    websocket: {
      async message(ws, message) {
        await handleWSMessage(ws, message);
      },
      open(ws) {
        handleWSOpen(ws);
      },
      close(ws) {
        handleWSClose(ws);
      },
    },
  });
}

if (!server) {
  console.error('❌ Failed to start server: Could not bind to port ' + PORT);
  process.exit(1);
}

// Global error handlers to catch startup crashes
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', reason);
});

console.log(`🚀 FluxCore API running at http://localhost:${server.port}`);
console.log(`📚 Swagger docs at http://localhost:${server.port}/swagger`);
console.log(`🔌 WebSocket at ws://localhost:${server.port}/ws`);

// Start Kernel Runtime components with error protection
(async () => {
  try {
    console.log('⚙️ Starting Kernel components...');

    console.log('   - Kernel Dispatcher');
    await kernelDispatcher.start();

    console.log('   - Projectors');
    startProjectors();

    console.log('   - Kernel Bootstrap');
    await bootstrapKernel();

    console.log('   - Services Initialization');
    automationScheduler.init();
    wesScheduler.init();
    mediaOrchestrator.init();
    messageDispatchService.init();

    console.log('   - FluxCore v8.2 Runtime Registration');
    runtimeGateway.register(asistentesLocalRuntime);
    runtimeGateway.register(asistentesOpenAIRuntime);
    runtimeGateway.register(fluxiRuntime);

    if (featureFlags.fluxNewArchitecture) {
      console.log('   - CognitionWorker (FLUX_NEW_ARCHITECTURE=true)');
      cognitionWorker.start();
    } else {
      console.log('   - CognitionWorker DISABLED (set FLUX_NEW_ARCHITECTURE=true to enable)');
    }

    console.log('✅ Kernel & Services started successfully');
  } catch (error) {
    console.error('❌ CRITICAL ERROR during Kernel startup:', error);
    console.error(error);
  }
})();

const cleanupTasks: Array<() => Promise<void> | void> = [];

const addCleanupTask = (task: () => Promise<void> | void) => {
  cleanupTasks.push(task);
};

const useAccountDeletionQueue = featureFlags.accountDeletionQueue;

if (useAccountDeletionQueue) {
  startAccountDeletionQueue();
  addCleanupTask(async () => {
    await stopAccountDeletionQueue();
    await closeRedisConnection();
  });
  console.log('🧹 AccountDeletion processing running on BullMQ queue');
} else {
  accountDeletionWorker.start();
  addCleanupTask(() => accountDeletionWorker.stop());
  addCleanupTask(() => wesScheduler.stop());
  if (featureFlags.fluxNewArchitecture) {
    addCleanupTask(() => cognitionWorker.stop());
  }
  console.log('🧹 AccountDeletion processing running on interval worker');
}

// Iniciar ChatCore Outbox Worker para certificación en Kernel
chatCoreOutboxService.startWorker();
console.log('📮 ChatCore Outbox worker started for Kernel certification');

const handleShutdown = async (signal: NodeJS.Signals) => {
  console.log(`[shutdown] received ${signal}, cleaning up...`);
  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch (error) {
      console.error('[shutdown] cleanup task failed', error);
    }
  }
  process.exit(0);
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal as NodeJS.Signals, handleShutdown);
});

export type App = typeof elysiaApp;
