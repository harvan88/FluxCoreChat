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
  totalComponents: number;
  documentedComponents: number;
  score: number;
  criticalIssues: number;
  warnings: number;
  lastUpdated: string;
  topComponents: Array<{ name: string; score: number }>;
  undocumentedComponents: string[];
  subsystems: Array<{
    name: string;
    status: string;
    quality: string;
    domain: string;
  }>;
  subsystemsDocumented: number;
  totalSubsystems: number;
  formatErrors: Array<{
    component: string;
    error: string;
    filePath: string;
    fullError: string;
  }>;
  formatErrorsCount: number;
  // 🔥 NUEVOS CAMPOS: Métricas de Frontmatter
  wipDocs: number;
  needsReviewDocs: number;
  stableDocs: number;
}

export function DocumentationQualityPanel() {
  const [metrics, setMetrics] = useState<DocumentationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // VALIDACIÓN DE DATOS INCONSISTENTES EN TIEMPO REAL
  const dataInconsistencies = [];
  
  if (metrics) {
    if (metrics.documentedComponents === 0 && metrics.totalComponents > 0) {
      dataInconsistencies.push({
        type: 'error',
        message: 'Componentes documentados es 0 pero hay componentes totales',
        severity: 'critical'
      });
    }
    
    if (metrics.totalComponents === 0) {
      dataInconsistencies.push({
        type: 'error',
        message: 'No se encontraron componentes totales',
        severity: 'critical'
      });
    }
    
    if (metrics.criticalIssues > metrics.totalComponents) {
      dataInconsistencies.push({
        type: 'warning',
        message: 'Issues críticos mayor que componentes totales',
        severity: 'medium'
      });
    }
    
    if (metrics.score < 0 || metrics.score > 100) {
      dataInconsistencies.push({
        type: 'error',
        message: `Score inválido: ${metrics.score}% (debe ser 0-100)`,
        severity: 'critical'
      });
    }
  }

  // Calcular valores derivados una sola vez
  const coveragePercentage = metrics && metrics.totalComponents > 0 ? 
    (metrics.documentedComponents / metrics.totalComponents) * 100 : 0;
  const scoreColor = metrics ? getScoreColor(metrics.score) : 'text-red-500';
  const scoreBgColor = metrics ? getScoreBgColor(metrics.score) : 'bg-red-500/10 border-red-500/30';

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[DocumentationQualityPanel] Fetching live metrics from backend...');
      
      // Llamar al nuevo endpoint en vivo
      const response = await fetch('/api/fluxcore/documentation/quality');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: No se pudo cargar el reporte de validación en vivo`);
      }

      const parsedMetrics: DocumentationMetrics = await response.json();
      console.log('[DocumentationQualityPanel] Métricas recibidas:', parsedMetrics);

      // Mapear los datos de la API a la interfaz del frontend
      setMetrics({
        ...parsedMetrics,
        // Mantener la estructura topComponents como la espera la UI
        topComponents: parsedMetrics.topComponents || [],
        subsystems: [], // Pendiente: implementar lógica de subsistemas en backend
        subsystemsDocumented: 0,
        totalSubsystems: 4,
        // Calcular cobertura para la UI
        coveragePercentage: parsedMetrics.totalComponents > 0 
          ? (parsedMetrics.documentedComponents / parsedMetrics.totalComponents) * 100 
          : 0
      } as any); // Temporal until we align the interfaces exactly

    } catch (err) {
      console.error('Error completo en loadMetrics:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const openValidationReport = () => {
    // Abrir el reporte de validación en nueva pestaña
    window.open('/docs/reconstruction-phase-1/exhaustive-mapping/01-ui-landscape/VALIDATION_REPORT.md', '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-elevated">
        <div className="px-4 py-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <FileTextIcon size={18} />
            <h3 className="text-lg font-semibold text-primary">Documentation Quality</h3>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RotateCcwIcon size={24} className="animate-spin text-muted mb-2" />
            <p className="text-muted">Cargando métricas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-elevated">
        <div className="px-4 py-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <FileTextIcon size={18} />
            <h3 className="text-lg font-semibold text-primary">Documentation Quality</h3>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <FileTextIcon size={48} className="text-red-400 mb-4" />
            <p className="text-red-400 mb-2">🚨 Error al cargar métricas</p>
            <p className="text-muted text-sm mb-4">{error}</p>
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-700 font-medium mb-2">🔍 Posibles causas:</p>
              <ul className="text-xs text-red-600 text-left space-y-1">
                <li>• Reporte de validación corrupto o incompleto</li>
                <li>• Formato del reporte modificado</li>
                <li>• Error de parsing en datos críticos</li>
                <li>• Problema de conexión al servidor</li>
              </ul>
            </div>
            <button 
              onClick={loadMetrics}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              🔄 Reintentar Carga
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-elevated">
      <div className="px-4 py-3 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileTextIcon size={18} />
            <h3 className="text-lg font-semibold text-primary">Documentation Quality</h3>
          </div>
          <button 
            onClick={openValidationReport}
            className="flex items-center gap-1 px-3 py-1 text-sm text-secondary hover:text-primary transition-colors"
            title="Ver reporte completo"
          >
            <ExternalLinkIcon size={14} />
            Reporte
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Score Principal */}
        <div className={`p-4 rounded-lg border ${scoreBgColor}`}>
          <div className="text-center">
            <div className={`text-4xl font-bold ${scoreColor}`}>
              {metrics.score.toFixed(1)}%
            </div>
            <p className="text-sm text-muted mt-1">Score General</p>
            <div className="w-full bg-surface/50 rounded-full h-2 mt-3">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  metrics.score >= 90 ? 'bg-green-500' : 
                  metrics.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Métricas Clave */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-lg p-3 border border-subtle">
            <div className="text-2xl font-bold text-primary">
              {metrics.documentedComponents}/{metrics.totalComponents}
            </div>
            <p className="text-xs text-muted">Componentes</p>
            <div className="w-full bg-surface/50 rounded-full h-1 mt-2">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                style={{ width: `${coveragePercentage}%` }}
              />
            </div>
          </div>
          
          <div className="bg-surface rounded-lg p-3 border border-subtle">
            <div className="text-2xl font-bold text-red-400">
              {metrics.criticalIssues}
            </div>
            <p className="text-xs text-muted">Críticos</p>
            {metrics.criticalIssues > 0 && (
              <div className="text-xs text-red-400 mt-1">Requieren atención</div>
            )}
          </div>
          
          {/* NUEVO: Métricas de Frontmatter (Estado) */}
          <div className="bg-surface rounded-lg p-3 border border-subtle col-span-2">
            <h4 className="text-sm font-medium text-primary mb-2">Estado de Documentación (Frontmatter)</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                <div className="text-lg font-bold text-yellow-500">{metrics.wipDocs}</div>
                <div className="text-[10px] text-yellow-600/80 uppercase">WIP</div>
              </div>
              <div className="text-center p-2 bg-red-500/10 rounded border border-red-500/20">
                <div className="text-lg font-bold text-red-500">{metrics.needsReviewDocs}</div>
                <div className="text-[10px] text-red-600/80 uppercase">Review</div>
              </div>
              <div className="text-center p-2 bg-green-500/10 rounded border border-green-500/20">
                <div className="text-lg font-bold text-green-500">{metrics.stableDocs}</div>
                <div className="text-[10px] text-green-600/80 uppercase">Stable</div>
              </div>
            </div>
          </div>
          
          <div className="bg-surface rounded-lg p-3 border border-subtle">
            <div className="text-2xl font-bold text-orange-400">
              {metrics.formatErrorsCount}
            </div>
            <p className="text-xs text-muted">Formato Inválido</p>
            {metrics.formatErrorsCount > 0 && (
              <div className="text-xs text-orange-400 mt-1">Requieren corrección</div>
            )}
          </div>
          
          <div className="bg-surface rounded-lg p-3 border border-subtle">
            <div className="text-2xl font-bold text-yellow-400">
              {metrics.warnings}
            </div>
            <p className="text-xs text-muted">Advertencias</p>
          </div>
        </div>

        {/* Métricas Clave */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-subtle">
            <span className="text-sm text-secondary">Cobertura</span>
            <span className="text-sm font-medium text-primary">
              {coveragePercentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-subtle">
            <span className="text-sm text-secondary">Subsistemas</span>
            <span className="text-sm font-medium text-purple-600">
              {metrics.subsystemsDocumented}/{metrics.totalSubsystems}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-subtle">
            <span className="text-sm text-secondary">Formato Inválido</span>
            <span className="text-sm font-medium text-orange-400">
              {metrics.formatErrorsCount}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-subtle">
            <span className="text-sm text-secondary">Última actualización</span>
            <span className="text-sm font-medium text-muted text-right">
              {metrics.lastUpdated}
            </span>
          </div>
        </div>

        {/* Top Componentes */}
        {metrics.topComponents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-primary">🏆 Top Componentes</h4>
            <div className="space-y-1">
              {metrics.topComponents.slice(0, 5).map((comp, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-surface border border-subtle">
                  <span className="text-sm text-secondary truncate">{comp.name}</span>
                  <span className="text-sm font-medium text-green-400">{comp.score.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerta de Documentos Inválidos */}
        {metrics && metrics.formatErrorsCount > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-500">🚨 Documentos con Formato Inválido</h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-red-700">
                  ⚠️ Se detectaron {metrics.formatErrorsCount} documentos que no cumplen con el formato oficial
                </span>
                <CopyButton
                  text={(() => {
                    if (!metrics || metrics.formatErrors.length === 0) return '';
                    
                    const errorsText = metrics.formatErrors.map(error => 
                      `🚨 ${error.component}\n❌ Error: ${error.error}\n📄 Archivo: ${error.filePath}\n`
                    ).join('\n');
                    
                    return `📊 Errores de Formato de Documentación\n\n${errorsText}\n🔍 Acción requerida: Corregir el formato de estos documentos para cumplir los estándares.\n📋 Formato requerido: Debe incluir # Título, ## 🎯 Propósito, ## 🏗️ Arquitectura, **Ubicación:**, **Tamaño:**, **Propósito:**`;
                  })()}
                  title="Copiar errores de formato"
                  size="sm"
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  onError={(error) => {
                    console.error('[DocumentationQualityPanel] Error al copiar errores:', error);
                  }}
                  onSuccess={() => {
                    console.log('[DocumentationQualityPanel] Errores de formato copiados exitosamente');
                  }}
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {metrics.formatErrors.slice(0, 10).map((error, index) => (
                  <div key={index} className="bg-white border border-red-100 rounded p-2">
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">🚨</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-red-700 text-sm">{error.component}</span>
                          <span className="text-xs text-gray-500">({error.filePath})</span>
                        </div>
                        <div className="text-red-600 text-xs mb-1">{error.error}</div>
                        <div className="text-xs text-gray-600">
                          🔍 <strong>Requiere:</strong> Agregar sección faltante para cumplir formato oficial
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {metrics.formatErrors.length > 10 && (
                  <div className="text-xs text-red-600 text-center pt-1 bg-red-100 rounded p-2">
                    ... y {metrics.formatErrors.length - 10} errores más (usar botón "Copiar" para ver todos)
                  </div>
                )}
              </div>
              <div className="text-xs text-red-600 border-t border-red-200 pt-2 mt-2 bg-red-100 rounded p-2">
                <div className="font-medium mb-1">🔍 <strong>Acción requerida:</strong></div>
                <div>• Corregir el formato de estos documentos para cumplir los estándares</div>
                <div>• Formato requerido: # Título, ## 🎯 Propósito, ## 🏗️ Arquitectura, **Ubicación:**, **Tamaño:**, **Propósito:**</div>
                <div>• Usar botón "📋 Copiar" para obtener lista completa con rutas de archivos</div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard de Subsistemas */}
        {metrics && metrics.subsystems && metrics.subsystems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-primary">🎯 Subsistemas</h4>
            <div className="space-y-1">
              {metrics.subsystems.map((subsystem, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-surface border border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-secondary truncate">{subsystem.name}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      subsystem.domain === 'FluxCore' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {subsystem.domain}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      subsystem.status === 'Funcional' 
                        ? 'text-green-600' 
                        : subsystem.status === 'No canónico' 
                        ? 'text-red-600' 
                        : 'text-yellow-600'
                    }`}>
                      {subsystem.status}
                    </span>
                    <span className="text-xs font-medium text-gray-500">{subsystem.quality}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Componentes Críticos */}
        {metrics && metrics.undocumentedComponents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-primary">🚨 Componentes Críticos</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {metrics.undocumentedComponents.slice(0, 10).map((comp, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-surface border border-subtle">
                  <span className="text-sm text-secondary truncate">{comp}</span>
                  <span className="text-sm font-medium text-red-400">0%</span>
                </div>
              ))}
              {metrics.undocumentedComponents.length > 10 && (
                <div className="text-xs text-muted text-center pt-1">
                  ... y {metrics.undocumentedComponents.length - 10} más
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-2 pt-2">
          <button 
            onClick={loadMetrics}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-subtle text-primary rounded-lg hover:bg-hover transition-colors"
          >
            <RotateCcwIcon size={16} />
            Actualizar Métricas
          </button>
        </div>

        {/* Información */}
        <div className="text-xs text-muted space-y-1 pt-2 border-t border-subtle">
          <p>&bull; Métricas de {metrics.totalComponents} componentes UI</p>
          <p>&bull; Score objetivo: &gt;90% para calidad aceptable</p>
          <p>&bull; Subsistemas: {metrics.subsystemsDocumented}/{metrics.totalSubsystems} documentados</p>
          <p>&bull; Documentos con formato inválido: {metrics.formatErrorsCount} requieren corrección</p>
          <p>&bull; Actualizado: {metrics.lastUpdated}</p>
          <p>&bull; Score: {metrics.score.toFixed(1)}% (componentes individuales)</p>
          <p>&bull; 📊 Coverage: {coveragePercentage.toFixed(1)}% (calculado: {metrics.documentedComponents}/{metrics.totalComponents})</p>
          {metrics.formatErrorsCount > 0 && (
            <p className="text-orange-600">🚨 ALERTA: Hay {metrics.formatErrorsCount} documentos con formato inválido</p>
          )}
        </div>
      </div>
    </div>
  );
}
