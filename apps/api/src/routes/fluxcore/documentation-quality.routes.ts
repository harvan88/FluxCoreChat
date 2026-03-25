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

/**
 * POST /fluxcore/documentation/build-layer-2
 * Construye mecánicamente la Capa 2 (Connections e Interdependencias) en archivos MD pendientes.
 */
documentationQualityRoutes.post('/build-layer-2', async () => {
  try {
    const result = await documentationQualityService.buildLayer2Connections();
    
    // Disparamos una re-generación de métricas para actualizar el Monitor y el Snapshot
    await documentationQualityService.getQualityMetrics();
    
    return {
      success: true,
      message: 'Capa 2 generada exitosamente.',
      data: result
    };
  } catch (error) {
    console.error('[DocumentationQualityRoute] Error building layer 2:', error);
    return { error: 'Failed to build layer 2 connections' };
  }
});
