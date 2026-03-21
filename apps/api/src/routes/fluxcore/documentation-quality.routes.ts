import { Elysia } from 'elysia';
import { documentationQualityService } from '../../services/fluxcore/documentation-quality.service';

export const documentationQualityRoutes = new Elysia({ prefix: '/fluxcore/documentation' });

/**
 * GET /fluxcore/documentation/quality
 * Retorna las métricas de calidad de documentación en tiempo real
 */
documentationQualityRoutes.get('/quality', async () => {
  try {
    const metrics = await documentationQualityService.getQualityMetrics();
    return metrics;
  } catch (error) {
    console.error('[DocumentationQualityRoute] Error:', error);
    return { error: 'Failed to generate documentation metrics' };
  }
});
