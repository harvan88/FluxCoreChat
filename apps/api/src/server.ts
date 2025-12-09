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

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth.routes';
import { accountsRoutes } from './routes/accounts.routes';
import { relationshipsRoutes } from './routes/relationships.routes';
import { conversationsRoutes } from './routes/conversations.routes';
import { messagesRoutes } from './routes/messages.routes';
import { automationRoutes } from './routes/automation.routes';
import { adaptersRoutes } from './routes/adapters.routes';
import { extensionRoutes } from './routes/extensions.routes';
import { handleWSMessage, handleWSOpen, handleWSClose } from './websocket/ws-handler';
import { manifestLoader } from './services/manifest-loader.service';
import * as path from 'path';
import * as fs from 'fs';

const PORT = process.env.PORT || 3000;

// Cargar extensiones desde el directorio /extensions
const extensionsDir = path.resolve(__dirname, '../../../extensions');
if (fs.existsSync(extensionsDir)) {
  const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const extPath = path.join(extensionsDir, entry.name);
      manifestLoader.loadFromDirectory(extPath);
    }
  }
  console.log(`🧩 Loaded ${manifestLoader.getAllManifests().length} extensions`);
}

// Crear app Elysia para HTTP
const elysiaApp = new Elysia()
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
  .use(automationRoutes)
  .use(adaptersRoutes)
  .use(extensionRoutes);

// Servidor híbrido: HTTP (Elysia) + WebSocket (Bun nativo)
const server = Bun.serve({
  port: PORT,
  
  // Handler para HTTP - delega a Elysia
  fetch(req, server) {
    // Upgrade a WebSocket si es request de WS
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
    
    // Delegar a Elysia para HTTP
    return elysiaApp.handle(req);
  },
  
  // Handler para WebSocket
  websocket: {
    message(ws, message) {
      handleWSMessage(ws, message);
    },
    open(ws) {
      handleWSOpen(ws);
    },
    close(ws) {
      handleWSClose(ws);
    },
  },
});

console.log(`🚀 FluxCore API running at http://localhost:${server.port}`);
console.log(`📚 Swagger docs at http://localhost:${server.port}/swagger`);
console.log(`🔌 WebSocket at ws://localhost:${server.port}/ws`);

export type App = typeof elysiaApp;
