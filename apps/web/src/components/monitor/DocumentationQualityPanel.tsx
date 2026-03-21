/**
 * DocumentationQualityPanel.tsx
 *
 * Panel completo para mostrar el dashboard de calidad de documentación
 * Integrado en el Monitoring Hub de FluxCoreChat - ÚNICA FUENTE DE VERDAD
 */

import { useState, useEffect } from 'react';
import { FileTextIcon, RotateCcwIcon, ExternalLinkIcon } from 'lucide-react';
import { CopyButton } from '../ui';

interface DocumentationMetrics {
  // MÉTRICAS PRINCIPALES
  qualityScore: number;
  confidenceIndex: number;
  uiCoverage: number;
  backendCoverage: number;

  // DESGLOSE FÍSICO
  totalDocs: number;
  uiDocsCount: number;
  totalUiComponents: number;
  backendDocsCount: number;
  totalBackendComponents: number;

  // ESTADOS DEL FRONTMATTER
  wipDocs: number;
  needsReviewDocs: number;
  stableDocs: number;
  wipDocsList: string[];
  needsReviewDocsList: string[];
  stableDocsList: string[];
  undocumentedComponents: string[];
  undocumentedBackendComponents: string[];

  // INCIDENCIAS
  criticalIssues: number;
  warnings: number;
  formatErrorsCount: number;

  // DETALLES
  lastUpdated: string;
  topComponents: Array<{ name: string; score: number }>;
  formatErrors: Array<{
    component: string;
    error: string;
    filePath: string;
    fullError: string;
  }>;
  warningsList: Array<{ component: string; warning: string }>;
}

export function DocumentationQualityPanel() {
  const [metrics, setMetrics] = useState<DocumentationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Estados para controlar secciones colapsables
  const [expandedSections, setExpandedSections] = useState({
    backend: true,
    ui: true,
    wip: true,
    needsReview: true,
    criticalErrors: false,
    warnings: false,
    stable: false,
  });

  // Helper functions
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/10 border-green-500/30';
    if (score >= 70) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const timestamp = Date.now();
      const response = await fetch(`/api/fluxcore/documentation/quality?t=${timestamp}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: No se pudo cargar el reporte en vivo`);
      }

      const parsedMetrics = await response.json();
      setMetrics(parsedMetrics);
    } catch (err) {
      console.error('Error completo en loadMetrics:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [forceRefresh]);

  const openValidationReport = () => {
    window.open(
      '/docs/reconstruction-phase-1/exhaustive-mapping/01-ui-landscape/VALIDATION_REPORT.md',
      '_blank'
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-elevated">
        <div className="px-4 py-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <FileTextIcon size={18} className="text-primary" />
            <h3 className="text-lg font-semibold text-primary">Calidad de Documentación</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <RotateCcwIcon size={24} className="animate-spin text-muted mb-2" />
          <p className="text-muted ml-2">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex flex-col h-full bg-elevated">
        <div className="px-4 py-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <FileTextIcon size={18} className="text-primary" />
            <h3 className="text-lg font-semibold text-primary">Calidad de Documentación</h3>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <FileTextIcon size={48} className="text-red-400 mb-4" />
          <p className="text-red-400 mb-2">🚨 Error al cargar métricas</p>
          <p className="text-muted text-sm mb-4">{error}</p>
          <button
            onClick={loadMetrics}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const scoreColor = getScoreColor(metrics.qualityScore || 0);
  const scoreBgColor = getScoreBgColor(metrics.qualityScore || 0);

  return (
    <div className="flex flex-col h-full bg-elevated">
      <div className="px-4 py-3 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileTextIcon size={18} className="text-primary" />
          <h3 className="text-lg font-semibold text-primary">Calidad de Documentación</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setForceRefresh((prev) => prev + 1)}
            className="p-1.5 text-muted hover:text-primary transition-colors bg-surface rounded"
            title="Refrescar"
          >
            <RotateCcwIcon size={14} />
          </button>
          <button
            onClick={openValidationReport}
            className="text-xs text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <ExternalLinkIcon className="w-3 h-3" />
            Reporte CLI
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Score Principal */}
        <div className={`p-4 rounded-lg border ${scoreBgColor}`}>
          <div className="text-center">
            <div className={`text-4xl font-bold ${scoreColor}`}>
              {(metrics.qualityScore || 0).toFixed(1)}%
            </div>
            <p className="text-sm text-muted mt-1">Calidad Promedio (Estructural)</p>
            <div className="w-full bg-surface/50 rounded-full h-2 mt-3">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${(metrics.qualityScore || 0) >= 90 ? 'bg-green-500' : (metrics.qualityScore || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${metrics.qualityScore || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Métricas Clave */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-lg p-3 border border-subtle">
            <div className="text-2xl font-bold text-primary">
              {(metrics.uiCoverage || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted">
              Cobertura UI ({metrics.uiDocsCount || 0}/{metrics.totalUiComponents || 0})
            </p>
          </div>

          <div className="bg-surface rounded-lg p-3 border border-subtle">
            <div
              className={`text-2xl font-bold ${(metrics.confidenceIndex || 0) >= 80 ? 'text-green-500' : (metrics.confidenceIndex || 0) >= 50 ? 'text-yellow-500' : 'text-red-500'}`}
            >
              {(metrics.confidenceIndex || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted">Índice de Confianza</p>
          </div>
        </div>

        {/* Cobertura Backend (NUEVO) */}
        <div className="bg-surface rounded-lg p-3 border border-subtle">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted">Cobertura Backend</span>
            <span className="text-xs font-bold text-primary">
              {(metrics.backendCoverage || 0).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-surface/50 rounded-full h-1.5 mb-1">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${(metrics.backendCoverage || 0) >= 80 ? 'bg-green-500' : (metrics.backendCoverage || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${metrics.backendCoverage || 0}%` }}
            />
          </div>
          <p className="text-[10px] text-muted text-right">
            ({metrics.backendDocsCount || 0}/{metrics.totalBackendComponents || 0} módulos
            core/servicios)
          </p>
        </div>

        {/* Alertas - Resumen Compacto */}
        <div className="grid grid-cols-7 gap-2">
          <div className="bg-surface rounded-lg p-3 border border-subtle text-center">
            <div className="text-xl font-bold text-red-400">{metrics.criticalIssues}</div>
            <p className="text-xs text-muted">Errores</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-subtle text-center">
            <div className="text-xl font-bold text-yellow-400">{metrics.warnings}</div>
            <p className="text-xs text-muted">Advertencias</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-subtle text-center">
            <div className="text-xl font-bold text-purple-400">{metrics.undocumentedBackendComponents?.length || 0}</div>
            <p className="text-xs text-muted">Backend</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-subtle text-center">
            <div className="text-xl font-bold text-red-400">{metrics.undocumentedComponents?.length || 0}</div>
            <p className="text-xs text-muted">UI</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-subtle text-center">
            <div className="text-xl font-bold text-yellow-400">{metrics.wipDocs}</div>
            <p className="text-xs text-muted">WIP</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-subtle text-center">
            <div className="text-xl font-bold text-blue-400">{metrics.needsReviewDocs}</div>
            <p className="text-xs text-muted">Review</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-subtle text-center">
            <div className="text-xl font-bold text-green-400">{metrics.stableDocs}</div>
            <p className="text-xs text-muted">Stable</p>
          </div>
        </div>

        {/* Métricas de Frontmatter (Estado) con Acordeones */}
        <div className="bg-elevated border border-subtle rounded-lg p-3">
          <h4 className="text-xs font-semibold text-muted mb-2 uppercase">Estados y Faltantes</h4>
          <div className="flex flex-col space-y-3">
            {/* UNDOCUMENTED BACKEND COMPONENTS */}
            {metrics.undocumentedBackendComponents &&
              metrics.undocumentedBackendComponents.length > 0 && (
                <div className="flex flex-col border border-purple-500/20 rounded-md overflow-hidden">
                  <div 
                    className="flex justify-between items-center text-sm p-2 bg-purple-500/10 text-purple-500 cursor-pointer hover:bg-purple-500/20 transition-colors"
                    onClick={() => toggleSection('backend')}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span className="transition-transform duration-200">
                        {expandedSections.backend ? '▼' : '▶'}
                      </span>
                      <span>🔴 Faltan por documentar (Backend)</span>
                      <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {metrics.undocumentedBackendComponents.length}
                      </span>
                    </span>
                    <CopyButton
                      text={metrics.undocumentedBackendComponents.join('\n')}
                      title="Copiar lista"
                      size="sm"
                      className="p-1 hover:bg-purple-500/20 rounded"
                    />
                  </div>
                  {expandedSections.backend && (
                    <div className="max-h-32 overflow-y-auto bg-surface/50 p-2 custom-scrollbar">
                      {metrics.undocumentedBackendComponents.map((comp, i) => (
                        <div
                          key={i}
                          className="text-xs text-muted truncate py-0.5 border-b border-subtle/50 last:border-0 hover:text-primary transition-colors"
                          title={comp}
                        >
                          {comp}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {/* UNDOCUMENTED COMPONENTS */}
            {metrics.undocumentedComponents && metrics.undocumentedComponents.length > 0 && (
              <div className="flex flex-col border border-red-500/20 rounded-md overflow-hidden">
                <div 
                  className="flex justify-between items-center text-sm p-2 bg-red-500/10 text-red-500 cursor-pointer hover:bg-red-500/20 transition-colors"
                  onClick={() => toggleSection('ui')}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="transition-transform duration-200">
                      {expandedSections.ui ? '▼' : '▶'}
                    </span>
                    <span>🔴 Faltan por documentar (UI)</span>
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {metrics.undocumentedComponents.length}
                    </span>
                  </span>
                  <CopyButton
                    text={metrics.undocumentedComponents.join('\n')}
                    title="Copiar lista"
                    size="sm"
                    className="p-1 hover:bg-red-500/20 rounded"
                  />
                </div>
                {expandedSections.ui && (
                  <div className="max-h-32 overflow-y-auto bg-surface/50 p-2 custom-scrollbar">
                    {metrics.undocumentedComponents.map((comp, i) => (
                      <div
                        key={i}
                        className="text-xs text-muted truncate py-0.5 border-b border-subtle/50 last:border-0 hover:text-primary transition-colors"
                        title={comp}
                      >
                        {comp}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WIP DOCS */}
            {metrics.wipDocsList && metrics.wipDocsList.length > 0 && (
              <div className="flex flex-col border border-yellow-500/20 rounded-md overflow-hidden">
                <div 
                  className="flex justify-between items-center text-sm p-2 bg-yellow-500/10 text-yellow-500 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                  onClick={() => toggleSection('wip')}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="transition-transform duration-200">
                      {expandedSections.wip ? '▼' : '▶'}
                    </span>
                    <span>🚧 WIP (Incompletos)</span>
                    <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {metrics.wipDocs}
                    </span>
                  </span>
                  <CopyButton
                    text={metrics.wipDocsList.join('\n')}
                    title="Copiar lista"
                    size="sm"
                    className="p-1 hover:bg-yellow-500/20 rounded"
                  />
                </div>
                {expandedSections.wip && (
                  <div className="max-h-32 overflow-y-auto bg-surface/50 p-2 custom-scrollbar">
                    {metrics.wipDocsList.map((doc, i) => (
                      <div
                        key={i}
                        className="text-xs text-muted truncate py-0.5 border-b border-subtle/50 last:border-0"
                      >
                        {doc}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NEEDS REVIEW DOCS */}
            {metrics.needsReviewDocsList && metrics.needsReviewDocsList.length > 0 && (
              <div className="flex flex-col border border-blue-500/20 rounded-md overflow-hidden">
                <div 
                  className="flex justify-between items-center text-sm p-2 bg-blue-500/10 text-blue-500 cursor-pointer hover:bg-blue-500/20 transition-colors"
                  onClick={() => toggleSection('needsReview')}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="transition-transform duration-200">
                      {expandedSections.needsReview ? '▼' : '▶'}
                    </span>
                    <span>🔍 Needs Review (Tienen dudas)</span>
                    <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {metrics.needsReviewDocs}
                    </span>
                  </span>
                  <CopyButton
                    text={metrics.needsReviewDocsList.join('\n')}
                    title="Copiar lista"
                    size="sm"
                    className="p-1 hover:bg-blue-500/20 rounded"
                  />
                </div>
                {expandedSections.needsReview && (
                  <div className="max-h-32 overflow-y-auto bg-surface/50 p-2 custom-scrollbar">
                    {metrics.needsReviewDocsList.map((doc, i) => (
                      <div
                        key={i}
                        className="text-xs text-muted truncate py-0.5 border-b border-subtle/50 last:border-0"
                      >
                        {doc}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resumen Stable */}
            <div className="flex flex-col border border-green-500/20 rounded-md overflow-hidden">
              <div 
                className="flex justify-between items-center text-sm p-2 bg-green-500/10 text-green-500 cursor-pointer hover:bg-green-500/20 transition-colors"
                onClick={() => toggleSection('stable')}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className="transition-transform duration-200">
                    {expandedSections.stable ? '▼' : '▶'}
                  </span>
                  <span>✅ Stable (Completos)</span>
                  <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {metrics.stableDocs}
                  </span>
                </span>
                {metrics.stableDocsList && metrics.stableDocsList.length > 0 && (
                  <CopyButton
                    text={metrics.stableDocsList.join('\n')}
                    title="Copiar lista"
                    size="sm"
                    className="p-1 hover:bg-green-500/20 rounded"
                  />
                )}
              </div>
              {expandedSections.stable && metrics.stableDocsList && metrics.stableDocsList.length > 0 && (
                <div className="max-h-32 overflow-y-auto bg-surface/50 p-2 custom-scrollbar">
                  {metrics.stableDocsList.map((doc, i) => (
                    <div
                      key={i}
                      className="text-xs text-muted truncate py-0.5 border-b border-subtle/50 last:border-0"
                    >
                      {doc}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de Errores Críticos */}
        {metrics.formatErrors && metrics.formatErrors.length > 0 && (
          <div className="flex flex-col border border-red-500/20 rounded-md overflow-hidden">
            <div 
              className="flex justify-between items-center text-sm p-2 bg-red-500/10 text-red-500 cursor-pointer hover:bg-red-500/20 transition-colors"
              onClick={() => toggleSection('criticalErrors')}
            >
              <span className="flex items-center gap-2 font-medium">
                <span className="transition-transform duration-200">
                  {expandedSections.criticalErrors ? '▼' : '▶'}
                </span>
                <span>🚨 Detalle de Errores Críticos</span>
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {metrics.formatErrors.length}
                </span>
              </span>
              <CopyButton
                text={metrics.formatErrors.map(e => `${e.component}: ${e.error}`).join('\n')}
                title="Copiar lista"
                size="sm"
                className="p-1 hover:bg-red-500/20 rounded"
              />
            </div>
            {expandedSections.criticalErrors && (
              <div className="max-h-32 overflow-y-auto bg-surface/50 p-2 custom-scrollbar">
                {metrics.formatErrors.map((error, i) => (
                  <div
                    key={i}
                    className="text-xs text-muted truncate py-0.5 border-b border-subtle/50 last:border-0 hover:text-primary transition-colors"
                    title={`${error.component}: ${error.error}`}
                  >
                    <span className="font-medium">{error.component}</span>: <span className="opacity-80">{error.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

            {/* Lista de Advertencias Reales */}
            {metrics.warningsList && metrics.warningsList.length > 0 && (
              <div className="flex flex-col border border-yellow-500/20 rounded-md overflow-hidden">
                <div 
                  className="flex justify-between items-center text-sm p-2 bg-yellow-500/10 text-yellow-500 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                  onClick={() => toggleSection('warnings')}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="transition-transform duration-200">
                      {expandedSections.warnings ? '▼' : '▶'}
                    </span>
                    <span>⚠️ Detalle de Advertencias</span>
                    <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {metrics.warningsList.length}
                    </span>
                  </span>
                  <CopyButton
                    text={metrics.warningsList.map(w => `${w.component}: ${w.warning}`).join('\n')}
                    title="Copiar lista"
                    size="sm"
                    className="p-1 hover:bg-yellow-500/20 rounded"
                  />
                </div>
                {expandedSections.warnings && (
                  <div className="max-h-32 overflow-y-auto bg-surface/50 p-2 custom-scrollbar">
                    {metrics.warningsList.map((warn, i) => (
                      <div
                        key={i}
                        className="text-xs text-muted truncate py-0.5 border-b border-subtle/50 last:border-0 hover:text-primary transition-colors"
                        title={`${warn.component}: ${warn.warning}`}
                      >
                        <span className="font-medium">{warn.component}</span>: <span className="opacity-80">{warn.warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
