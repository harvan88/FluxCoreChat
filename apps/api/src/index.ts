import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
// import { swagger } from '@elysiajs/swagger'; // Temporalmente deshabilitado - problemas con Router export

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth.routes';
import { accountsRoutes } from './routes/accounts.routes';
import { relationshipsRoutes } from './routes/relationships.routes';
import { conversationsRoutes } from './routes/conversations.routes';
import { messagesRoutes } from './routes/messages.routes';
// import { websocketRoutes } from './routes/websocket.routes'; // Temporalmente deshabilitado

const PORT = process.env.PORT || 3000;

const app = new Elysia()
  .use(cors())
  // .use(
  //   swagger({
  //     documentation: {
  //       info: {
  //         title: 'FluxCore API',
  //         version: '0.2.0',
  //         description: 'API para FluxCore - Sistema de mensajería universal extensible',
  //       },
  //       tags: [
  //         { name: 'Health', description: 'Health check endpoints' },
  //         { name: 'Auth', description: 'Authentication endpoints' },
  //         { name: 'Accounts', description: 'Account management' },
  //         { name: 'Relationships', description: 'Relationship management' },
  //         { name: 'Conversations', description: 'Conversation management' },
  //         { name: 'Messages', description: 'Messaging endpoints' },
  //       ],
  //     },
  //   })
  // )
  .use(healthRoutes)
  .use(authRoutes)
  .use(accountsRoutes)
  .use(relationshipsRoutes)
  .use(conversationsRoutes)
  .use(messagesRoutes)
  // .use(websocketRoutes) // Temporalmente deshabilitado
  .listen(PORT);

console.log(`🚀 FluxCore API running at http://${app.server?.hostname}:${app.server?.port}`);
// console.log(`📚 Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`);
// console.log(`🔌 WebSocket at ws://${app.server?.hostname}:${app.server?.port}/ws`);

export type App = typeof app;
