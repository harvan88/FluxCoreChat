/**
 * Hito 11: Health Check Endpoints Mejorados
 * Production-ready health monitoring
 */

import { Elysia } from 'elysia';
import { db, users } from '@fluxcore/db';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  service: string;
  checks?: {
    database?: { status: 'pass' | 'fail'; responseTime?: number; message?: string };
    memory?: { status: 'pass' | 'fail'; message?: string };
  };
}

export const healthRoutes = new Elysia({ prefix: '/health' })
  // Basic health check
  .get('/', () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'fluxcore-api',
    version: '0.2.0',
    uptime: process.uptime(),
  }))

  // Liveness probe
  .get('/live', () => ({
    status: 'alive',
    timestamp: new Date().toISOString(),
  }))

  // Readiness probe with dependency checks
  .get('/ready', async () => {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: HealthStatus['status'] = 'healthy';

    // Check Database
    try {
      const dbStart = Date.now();
      await db.select().from(users).limit(1);
      checks.database = {
        status: 'pass',
        responseTime: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: 'fail',
        message: (error as Error).message,
      };
      overallStatus = 'unhealthy';
    }

    // Check Memory
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    checks.memory = {
      status: memUsagePercent < 90 ? 'pass' : 'fail',
      message: `${memUsagePercent.toFixed(2)}% used`,
    };

    if (memUsagePercent >= 90) {
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    const health: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.2.0',
      service: 'fluxcore-api',
      checks,
    };

    return health;
  })

  // System metrics
  .get('/metrics', () => {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        heapUsedPercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2),
      },
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  });
