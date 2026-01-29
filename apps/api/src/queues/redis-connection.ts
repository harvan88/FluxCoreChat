import IORedis from 'ioredis';
import type { Redis } from 'ioredis';

let redisConnection: Redis | null = null;

const getRedisUrl = () => process.env.REDIS_URL || 'redis://localhost:6379';

export const getRedisConnection = (): Redis => {
  if (redisConnection) {
    return redisConnection;
  }

  const redisUrl = getRedisUrl();
  redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redisConnection.on('error', (error: unknown) => {
    console.error('[queues] Redis connection error', error);
  });

  redisConnection.on('connect', () => {
    console.log('[queues] Redis connection established', redisUrl);
  });

  return redisConnection;
};

export const closeRedisConnection = async () => {
  if (!redisConnection) {
    return;
  }

  try {
    await redisConnection.quit();
  } catch (error) {
    console.warn('[queues] Failed to close Redis connection', error);
  } finally {
    redisConnection = null;
  }
};
