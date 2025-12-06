import { Elysia } from 'elysia';

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'fluxcore-api',
    version: '0.1.0',
  }))
  .get('/ready', () => ({
    status: 'ready',
    database: 'not_connected', // Will be implemented in Hito 1
    timestamp: new Date().toISOString(),
  }));
