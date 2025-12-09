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
  })

  // Diagnostic endpoint - Full database state
  .get('/diagnostic', async () => {
    const start = Date.now();
    const errors: string[] = [];
    
    // Import all tables dynamically
    const { 
      accounts, 
      actors, 
      conversations, 
      messages, 
      relationships,
      workspaces,
      workspaceMembers,
      workspaceInvitations,
      extensionInstallations,
      automationRules,
    } = await import('@fluxcore/db');
    
    // Count all tables
    const counts: Record<string, number> = {};
    
    try {
      counts.users = (await db.select().from(users)).length;
    } catch (e) { errors.push(`users: ${(e as Error).message}`); counts.users = -1; }
    
    try {
      counts.accounts = (await db.select().from(accounts)).length;
    } catch (e) { errors.push(`accounts: ${(e as Error).message}`); counts.accounts = -1; }
    
    try {
      counts.actors = (await db.select().from(actors)).length;
    } catch (e) { errors.push(`actors: ${(e as Error).message}`); counts.actors = -1; }
    
    try {
      counts.relationships = (await db.select().from(relationships)).length;
    } catch (e) { errors.push(`relationships: ${(e as Error).message}`); counts.relationships = -1; }
    
    try {
      counts.conversations = (await db.select().from(conversations)).length;
    } catch (e) { errors.push(`conversations: ${(e as Error).message}`); counts.conversations = -1; }
    
    try {
      counts.messages = (await db.select().from(messages)).length;
    } catch (e) { errors.push(`messages: ${(e as Error).message}`); counts.messages = -1; }
    
    try {
      counts.workspaces = (await db.select().from(workspaces)).length;
    } catch (e) { errors.push(`workspaces: ${(e as Error).message}`); counts.workspaces = -1; }
    
    try {
      counts.workspaceMembers = (await db.select().from(workspaceMembers)).length;
    } catch (e) { errors.push(`workspaceMembers: ${(e as Error).message}`); counts.workspaceMembers = -1; }
    
    try {
      counts.workspaceInvitations = (await db.select().from(workspaceInvitations)).length;
    } catch (e) { errors.push(`workspaceInvitations: ${(e as Error).message}`); counts.workspaceInvitations = -1; }
    
    try {
      counts.extensionInstallations = (await db.select().from(extensionInstallations)).length;
    } catch (e) { errors.push(`extensionInstallations: ${(e as Error).message}`); counts.extensionInstallations = -1; }
    
    try {
      counts.automationRules = (await db.select().from(automationRules)).length;
    } catch (e) { errors.push(`automationRules: ${(e as Error).message}`); counts.automationRules = -1; }
    
    return {
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      database: 'postgresql',
      status: errors.length === 0 ? 'healthy' : 'degraded',
      tables: counts,
      errors: errors.length > 0 ? errors : undefined,
      totalRecords: Object.values(counts).filter(v => v >= 0).reduce((a, b) => a + b, 0),
    };
  });
