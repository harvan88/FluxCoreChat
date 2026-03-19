import { Router } from 'express';
import { documentationQualityService } from '../../services/fluxcore/documentation-quality.service';

export const documentationQualityRoutes = Router();

/**
 * GET /fluxcore/documentation/quality
 * Retorna las métricas de calidad de documentación en tiempo real
 */
documentationQualityRoutes.get('/quality', async (req, res) => {
  try {
    const metrics = await documentationQualityService.getQualityMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('[DocumentationQualityRoute] Error:', error);
    res.status(500).json({ error: 'Failed to generate documentation metrics' });
  }
});
