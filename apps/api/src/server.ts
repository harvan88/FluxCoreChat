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
import { contactsRoutes } from './routes/contacts.routes';
import { automationRoutes } from './routes/automation.routes';
import { adaptersRoutes } from './routes/adapters.routes';
import { extensionRoutes } from './routes/extensions.routes';
import { uploadRoutes } from './routes/upload.routes';
import { websiteRoutes } from './routes/website.routes';
import { handleWSMessage, handleWSOpen, handleWSClose } from './websocket/ws-handler';
import { manifestLoader } from './services/manifest-loader.service';
import { automationScheduler } from './services/automation-scheduler.service';
import * as path from 'path';
import * as fs from 'fs';

const PORT = process.env.PORT || 3000;

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ''));

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');

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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 60 * 60 * 24,
    })
  )
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
  .use(relationshipsRoutes)
  .use(conversationsRoutes)
  .use(messagesRoutes)
  .use(contactsRoutes)
  .use(automationRoutes)
  .use(adaptersRoutes)
  .use(extensionRoutes)
  .use(uploadRoutes)
  .use(websiteRoutes);

// Servidor híbrido: HTTP (Elysia) + WebSocket (Bun nativo)
const server = Bun.serve({
  port: PORT,
  
  // Handler para HTTP - delega a Elysia
  fetch(req, server) {
    // Upgrade a WebSocket si es request de WS
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined as any;
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
    
    // Serve uploaded files statically
    if (url.pathname.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), url.pathname);
        return new Response(Bun.file(filePath));
    }
    
    // Serve public websites (Karen extension)
    // Check if path matches /{alias} or /{alias}/*
    const publicSiteMatch = url.pathname.match(/^\/([a-zA-Z0-9_-]+)(\/.*)?$/);
    if (publicSiteMatch) {
      const alias = publicSiteMatch[1];
      const subPath = publicSiteMatch[2] || '/';
      
      // Skip API routes and known paths
      const reservedPaths = ['api', 'auth', 'accounts', 'relationships', 'conversations', 
        'messages', 'contacts', 'automation', 'adapters', 'extensions', 'websites', 
        'uploads', 'ws', 'swagger', 'health', 'app'];
      
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

automationScheduler.init();

export type App = typeof elysiaApp;
