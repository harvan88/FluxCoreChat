/**
 * Metrics Service - Monitoreo y Métricas del Sistema
 * 
 * Permite registrar métricas, consultar estadísticas,
 * y gestionar cache de queries.
 * 
 * RAG-011: Escalabilidad y Optimización
 */

import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface Metric {
    name: string;
    type: MetricType;
    value: number;
    dimensions?: Record<string, string>;
}

export interface VectorStoreStats {
    vectorStoreId: string;
    fileCount: number;
    chunkCount: number;
    totalTokens: number;
    embeddedChunkCount: number;
    embeddingCoveragePercent: number;
    totalQueries: number;
    lastQueryAt?: Date;
}

export interface SystemHealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        database: boolean;
        vectorIndex: boolean;
        embeddingProvider: boolean;
    };
    metrics: {
        avgQueryTimeMs: number;
        queriesPerMinute: number;
        cacheHitRate: number;
    };
}

// ════════════════════════════════════════════════════════════════════════════
// Main Service
// ════════════════════════════════════════════════════════════════════════════

export class MetricsService {
    private metricsBuffer: Metric[] = [];
    private flushInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Flush metrics cada 30 segundos
        this.flushInterval = setInterval(() => this.flushMetrics(), 30000);
    }

    /**
     * Registra una métrica
     */
    record(metric: Metric): void {
        this.metricsBuffer.push(metric);

        // Flush si buffer está lleno
        if (this.metricsBuffer.length >= 100) {
            this.flushMetrics();
        }
    }

    /**
     * Registra tiempo de ejecución de una operación
     */
    recordTiming(name: string, durationMs: number, dimensions?: Record<string, string>): void {
        this.record({
            name: `${name}.duration_ms`,
            type: 'histogram',
            value: durationMs,
            dimensions,
        });
    }

    /**
     * Incrementa un contador
     */
    increment(name: string, value = 1, dimensions?: Record<string, string>): void {
        this.record({
            name,
            type: 'counter',
            value,
            dimensions,
        });
    }

    /**
     * Registra un gauge (valor actual)
     */
    gauge(name: string, value: number, dimensions?: Record<string, string>): void {
        this.record({
            name,
            type: 'gauge',
            value,
            dimensions,
        });
    }

    private tableExistsChecked = false;
    private tableExists = true;

    /**
     * Flush métricas a la base de datos
     */
    async flushMetrics(): Promise<void> {
        if (this.metricsBuffer.length === 0) return;

        // Limitar tamaño del buffer para evitar fugas de memoria si la DB falla mucho tiempo
        if (this.metricsBuffer.length > 1000) {
            console.warn('[MetricsService] Buffer too large, dropping old metrics');
            this.metricsBuffer = this.metricsBuffer.slice(-500);
        }

        const metrics = [...this.metricsBuffer];
        this.metricsBuffer = [];

        try {
            const valueEntries = metrics.map(m =>
                sql`(${m.name}, ${m.type}, ${m.value}, ${m.dimensions || {}}::jsonb)`
            );

            await db.execute(sql`
                INSERT INTO fluxcore_system_metrics (metric_name, metric_type, value, dimensions)
                VALUES ${sql.join(valueEntries, sql`, `)}
            `);
            this.tableExists = true;
        } catch (error: any) {
            if (error.message?.includes('does not exist')) {
                this.tableExists = false;
                if (!this.tableExistsChecked) {
                    console.error('[MetricsService] Table fluxcore_system_metrics missing. Metrics will be dropped until table exists.');
                    this.tableExistsChecked = true;
                }
                // No re-add to buffer if table is missing to avoid loop noise
                return;
            }

            console.error('Failed to flush metrics:', error.message);
            // Re-add to buffer for retry if it's not a missing table error
            this.metricsBuffer.push(...metrics);
        }
    }

    /**
     * Obtiene estadísticas de un vector store
     */
    async getVectorStoreStats(vectorStoreId: string): Promise<VectorStoreStats | null> {
        const result = await db.execute(sql`
      SELECT 
        vector_store_id as "vectorStoreId",
        file_count as "fileCount",
        chunk_count as "chunkCount",
        total_tokens as "totalTokens",
        embedded_chunk_count as "embeddedChunkCount",
        embedding_coverage_percent as "embeddingCoveragePercent",
        total_queries as "totalQueries",
        last_query_at as "lastQueryAt"
      FROM fluxcore_vector_store_stats
      WHERE vector_store_id = ${vectorStoreId}::uuid
    `);

        const rows = result as any[];
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Recalcula estadísticas de un vector store
     */
    async recalculateStats(vectorStoreId: string): Promise<void> {
        await db.execute(sql`SELECT recalculate_vs_stats(${vectorStoreId}::uuid)`);
    }

    /**
     * Obtiene estado de salud del sistema
     */
    async getHealthStatus(): Promise<SystemHealthStatus> {
        const checks = {
            database: false,
            vectorIndex: false,
            embeddingProvider: false,
        };

        // Check database
        try {
            await db.execute(sql`SELECT 1`);
            checks.database = true;
        } catch (e) {
            console.error('Database health check failed:', e);
        }

        // Check vector index
        try {
            await db.execute(sql`
        SELECT indexname FROM pg_indexes 
        WHERE indexname = 'idx_document_chunks_embedding_hnsw'
      `);
            checks.vectorIndex = true;
        } catch (e) {
            console.error('Vector index health check failed:', e);
        }

        // TODO: Check embedding provider availability
        checks.embeddingProvider = true;

        // Get metrics
        const metrics = await this.getRecentMetrics();

        const status = Object.values(checks).every(c => c)
            ? 'healthy'
            : Object.values(checks).some(c => c)
                ? 'degraded'
                : 'unhealthy';

        return {
            status,
            checks,
            metrics,
        };
    }

    /**
     * Obtiene métricas recientes agregadas
     */
    private async getRecentMetrics(): Promise<SystemHealthStatus['metrics']> {
        try {
            const result = await db.execute(sql`
        SELECT 
          COALESCE(AVG(value) FILTER (WHERE metric_name = 'retrieval.duration_ms'), 0) as avg_query_time,
          COALESCE(COUNT(*) FILTER (WHERE metric_name = 'retrieval.query' AND recorded_at > now() - interval '1 minute'), 0) as queries_per_min,
          COALESCE(
            AVG(CASE WHEN metric_name = 'cache.hit' THEN 1.0 ELSE 0.0 END) FILTER (WHERE metric_name IN ('cache.hit', 'cache.miss')),
            0
          ) as cache_hit_rate
        FROM fluxcore_system_metrics
        WHERE recorded_at > now() - interval '5 minutes'
      `);

            const row = (result as any[])[0] || {};
            return {
                avgQueryTimeMs: Number(row.avg_query_time) || 0,
                queriesPerMinute: Number(row.queries_per_min) || 0,
                cacheHitRate: Number(row.cache_hit_rate) || 0,
            };
        } catch (e) {
            return { avgQueryTimeMs: 0, queriesPerMinute: 0, cacheHitRate: 0 };
        }
    }

    /**
     * Limpia cache expirado
     */
    async cleanupExpiredCache(): Promise<number> {
        const result = await db.execute(sql`SELECT cleanup_expired_cache() as count`);
        return (result as any[])[0]?.count || 0;
    }

    /**
     * Detiene el flush interval
     */
    shutdown(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushMetrics(); // Flush remaining
        }
    }
}

// Singleton export
export const metricsService = new MetricsService();

// ════════════════════════════════════════════════════════════════════════════
// Helper: Timing decorator
// ════════════════════════════════════════════════════════════════════════════

export function timed(metricName: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        void target;
        void propertyKey;
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const start = Date.now();
            try {
                return await originalMethod.apply(this, args);
            } finally {
                metricsService.recordTiming(metricName, Date.now() - start);
            }
        };

        return descriptor;
    };
}
