import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Estrategia de reintento para Redis
 */
const retryStrategy = (times: number) => {
  const delay = Math.min(times * 100, 3000);
  return delay;
};

// Singleton para el cliente de publicación
let pubClient: Redis | null = null;
// Singleton para el cliente de suscripción (Redis requiere conexiones separadas)
let subClient: Redis | null = null;

/**
 * Obtiene el cliente de publicación de Redis
 */
export function getRedisPub() {
  if (!pubClient) {
    console.log(`[Redis] Connecting to PUB at ${REDIS_URL}`);
    pubClient = new Redis(REDIS_URL, {
      retryStrategy,
      maxRetriesPerRequest: null,
    });

    pubClient.on('error', (err) => {
      console.error('[Redis PUB] Error:', err.message);
    });

    pubClient.on('reconnecting', () => {
      console.warn('[Redis PUB] Reconnecting...');
    });
  }
  return pubClient;
}

/**
 * Obtiene el cliente de suscripción de Redis
 */
export function getRedisSub() {
  if (!subClient) {
    console.log(`[Redis] Connecting to SUB at ${REDIS_URL}`);
    subClient = new Redis(REDIS_URL, {
      retryStrategy,
      maxRetriesPerRequest: null,
    });

    subClient.on('error', (err) => {
      console.error('[Redis SUB] Error:', err.message);
    });

    subClient.on('reconnecting', () => {
      console.warn('[Redis SUB] Reconnecting...');
    });
  }
  return subClient;
}

/**
 * Cierra las conexiones de Redis de forma limpia
 */
export async function quitRedis() {
  const quitters = [];
  if (pubClient) {
    console.log('[Redis] Quitting PUB client...');
    quitters.push(pubClient.quit());
    pubClient = null;
  }
  if (subClient) {
    console.log('[Redis] Quitting SUB client...');
    quitters.push(subClient.quit());
    subClient = null;
  }
  await Promise.all(quitters);
}
