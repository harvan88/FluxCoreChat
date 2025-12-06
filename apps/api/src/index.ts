import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

import { healthRoutes } from './routes/health';

const PORT = process.env.PORT || 3000;

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'FluxCore API',
          version: '0.1.0',
          description: 'API para FluxCore - Sistema de mensajería universal extensible',
        },
        tags: [
          { name: 'Health', description: 'Health check endpoints' },
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Accounts', description: 'Account management' },
          { name: 'Messages', description: 'Messaging endpoints' },
        ],
      },
    })
  )
  .use(healthRoutes)
  .listen(PORT);

console.log(`🚀 FluxCore API running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
