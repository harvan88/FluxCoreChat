import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import matter from 'gray-matter';

// Tipos extraídos del estándar AI_DOCUMENTATION_STANDARD.md
export interface DocFrontmatter {
  id?: string;
  type?: 'core' | 'subsystem' | 'smart-component' | 'ui-component' | 'unknown';
  status?: 'wip' | 'stable' | 'needs_review' | 'deprecated';
  criticality?: 'high' | 'medium' | 'low';
  location?: string;
}

export interface DocumentValidationResult {
  fileName: string;
  filePath: string;
  frontmatter: Partial<DocFrontmatter>;
  score: number;
  issues: string[];
  isValid: boolean;
}

export interface DocumentationQualityMetrics {
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

  // ESTADOS DEL FRONTMATTER Y LISTAS
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
  formatErrors: Array<{ component: string; error: string; filePath: string; fullError: string }>;
  warningsList: Array<{ component: string; warning: string }>;
}

export class DocumentationQualityService {
  // Ajustar la ruta relativa a desde donde se ejecuta el backend (usualmente la raíz del workspace si se usa turbo, o relativo a apps/api)
  // Asumimos que se puede resolver subiendo 2 niveles desde apps/api (hasta la raíz del monorepo)
  private get docsPath() {
    return join(process.cwd(), '../../docs/reconstruction-phase-1/exhaustive-mapping');
  }

  /**
   * Escanea recursivamente un directorio buscando archivos Markdown
   */
  private findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
    try {
      const files = readdirSync(dir);

      for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
          this.findMarkdownFiles(filePath, fileList);
        } else if (extname(file).toLowerCase() === '.md' && file !== 'VALIDATION_REPORT.md') {
          fileList.push(filePath);
        }
      }
    } catch (error) {
      console.warn(`[DocumentationQualityService] No se pudo leer el directorio: ${dir}`, error);
    }

    return fileList;
  }

  private findReactComponents(): string[] {
    const componentsBasePath = join(process.cwd(), '../../apps/web/src/components');

    // Patrones de exclusión basados en .gitignore y buenas prácticas
    const excludePatterns = [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.next',
      'coverage',
      '.turbo',
      '.cache',
      '__tests__',
      '*.test.*',
      '*.spec.*',
      'stories',
      'story',
    ];

    const componentsList: string[] = [];

    // Función de escaneo recursivo sin fs externa extra (solo nativos)
    const scanDirectory = (dir: string, depth = 0) => {
      // Limitar profundidad para evitar scans infinitos
      if (depth > 5) return;

      try {
        const fs = require('fs');
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = join(dir, file);
          const stat = fs.statSync(filePath);

          // Skip exclusion patterns
          if (
            excludePatterns.some((pattern) => {
              if (pattern.includes('*')) {
                return file.includes(pattern.replace('*', ''));
              }
              return file === pattern || filePath.includes(pattern);
            })
          ) {
            continue;
          }

          if (stat.isDirectory()) {
            scanDirectory(filePath, depth + 1);
          } else if (stat.isFile()) {
            // Contar solo archivos que podrían ser componentes React
            const fileName = file.toLowerCase();

            if (
              (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) &&
              !fileName.includes('.test.') &&
              !fileName.includes('.spec.') &&
              !fileName.includes('.stories.') &&
              !fileName.endsWith('.d.ts')
            ) {
              // Lectura eficiente del archivo para validar si es un componente
              try {
                const content = fs.readFileSync(filePath, 'utf-8');

                // Patrones que indican un componente React
                const isReactComponent =
                  content.includes('export default') &&
                  (content.includes('React.FC') ||
                    (content.includes('function ') && content.includes('return (')) ||
                    (content.includes('const ') &&
                      content.includes('=> (') &&
                      content.includes('JSX')) ||
                    content.includes('export function') ||
                    (content.includes('export const') && content.includes('=>')));

                if (isReactComponent) {
                  // Guardar ruta relativa para facilitar la comparación
                  const relativePath =
                    filePath.split('apps\\web\\src\\')[1] ||
                    filePath.split('apps/web/src/')[1] ||
                    file;
                  componentsList.push(relativePath.replace(/\\/g, '/'));
                }
              } catch (readError) {
                // Skip files that can't be read
                continue;
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[DocumentationQualityService] Could not scan directory: ${dir}`, error);
      }
    };

    try {
      scanDirectory(componentsBasePath);
    } catch (error) {
      console.error(`[DocumentationQualityService] Error scanning components:`, error);
    }

    return componentsList;
  }

  private findBackendComponents(): string[] {
    const apiBasePath = join(process.cwd(), '../../apps/api/src');

    const excludePatterns = [
      '__tests__',
      'scripts',
      '_legacy_archive',
      'node_modules',
      'dist',
      '.git',
      'audit-',
      'check-',
      'fix-',
      'test-',
      '.test.',
      '.spec.',
      '.d.ts',
    ];

    const componentsList: string[] = [];

    // We specifically want to track services, routes, core, and websocket
    const targetDirs = ['services', 'routes', 'core', 'websocket', 'middleware'];

    const scanDirectory = (dir: string, depth = 0) => {
      if (depth > 5) return;

      try {
        const fs = require('fs');
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = join(dir, file);
          const stat = fs.statSync(filePath);

          if (
            excludePatterns.some((pattern) => file.includes(pattern) || filePath.includes(pattern))
          ) {
            continue;
          }

          if (stat.isDirectory()) {
            scanDirectory(filePath, depth + 1);
          } else if (stat.isFile()) {
            const fileName = file.toLowerCase();

            if (fileName.endsWith('.ts')) {
              // Ensure it's inside one of our target directories
              const relativePath =
                filePath.split('apps\\api\\src\\')[1] || filePath.split('apps/api/src/')[1] || file;
              const normalizedPath = relativePath.replace(/\\/g, '/');

              if (targetDirs.some((td) => normalizedPath.startsWith(`${td}/`))) {
                componentsList.push(normalizedPath);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[DocumentationQualityService] Could not scan directory: ${dir}`, error);
      }
    };

    targetDirs.forEach((td) => {
      const targetPath = join(apiBasePath, td);
      try {
        const fs = require('fs');
        if (fs.existsSync(targetPath)) {
          scanDirectory(targetPath, 0);
        }
      } catch (e) {}
    });

    return componentsList;
  }

  /**
   * Valida un documento Markdown individual aplicando reglas de Tiers
   */
  private validateDocument(filePath: string): DocumentValidationResult {
    const fileName = filePath.split(/[\\/]/).pop() || 'Unknown';
    const issues: string[] = [];
    let score = 0;

    let content = '';
    let frontmatter: Partial<DocFrontmatter> = {};
    let hasFrontmatter = false;

    try {
      const fileContent = readFileSync(filePath, 'utf8');

      try {
        const parsed = matter(fileContent);
        if (Object.keys(parsed.data).length > 0) {
          frontmatter = parsed.data as Partial<DocFrontmatter>;
          content = parsed.content;
          hasFrontmatter = true;
        } else {
          content = fileContent; // No YAML detectado
        }
      } catch (parseError) {
        content = fileContent;
        issues.push(`🚨 ${fileName}: Error al parsear Frontmatter YAML`);
      }

      // 1. Validar Frontmatter (Base: 20 pts)
      if (!hasFrontmatter) {
        issues.push(
          `🚨 ${fileName}: Documento sin Frontmatter YAML (Ver AI_DOCUMENTATION_STANDARD)`
        );
      } else {
        score += 20;
        if (!frontmatter.type) issues.push(`🚨 ${fileName}: Frontmatter sin campo 'type'`);
        if (!frontmatter.status) issues.push(`🚨 ${fileName}: Frontmatter sin campo 'status'`);
        if (!frontmatter.location) issues.push(`🚨 ${fileName}: Frontmatter sin campo 'location'`);
      }

      // 2. Validación Asimétrica (Tiers)
      const docType = frontmatter.type || 'unknown';

      if (docType === 'core' || docType === 'subsystem') {
        if (!content.match(/propósito|propósito:|🎯/i))
          issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Propósito`);
        if (!content.match(/arquitectura|flujo|estructura|🏗️/i))
          issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Arquitectura/Flujo`);
        if (!content.match(/dependencias|consumido por|referencias/i))
          issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Dependencias`);
        score += 30;
      } else if (docType === 'smart-component') {
        if (!content.match(/propósito|propósito:|🎯/i))
          issues.push(`🚨 ${fileName} (Tier 2): Falta sección de Propósito`);
        if (!content.match(/estado|datos|hooks|use/i))
          issues.push(`🚨 ${fileName} (Tier 2): Falta sección de Estado/Hooks`);
        if (!content.match(/flujo|interacción|eventos|click/i))
          issues.push(`🚨 ${fileName} (Tier 2): Falta sección de Flujos de Interacción`);
        score += 30;
      } else if (docType === 'ui-component') {
        if (!content.match(/propósito|propósito:|🎯/i))
          issues.push(`🚨 ${fileName} (Tier 3): Falta sección de Propósito`);
        if (!content.match(/props|interfaz|interface|type/i))
          issues.push(`🚨 ${fileName} (Tier 3): Falta definición de Props`);
        if (!content.match(/ejemplo|uso|```tsx|```jsx/i))
          issues.push(`🚨 ${fileName} (Tier 3): Falta Ejemplo de Uso`);
        score += 30;
      } else {
        // Fallback para documentos sin clasificar
        if (content.match(/propósito|propósito:|🎯/i)) score += 10;
        else issues.push(`⚠️ ${fileName}: Sin sección de propósito`);
      }

      // 3. Reglas Generales (Código)
      if (content.includes('```typescript') || content.includes('```tsx')) {
        score += 10;
      } else {
        issues.push(`⚠️ ${fileName}: Sin ejemplos de código`);
      }

      // 4. Detección de Dudas Técnicas (regla crítica del estándar)
      if (content.match(/duda técnica|dudas técnicas|duda:|pregunta:|investigar|verificar|confirmar/i)) {
        issues.push(`🚨 ${fileName}: Contiene DUDAS TÉCNICAS - status debe ser 'needs_review'`);
        
        // Penalización extra si el frontmatter dice stable pero hay dudas
        if (frontmatter.status === 'stable') {
          issues.push(`🚨 ${fileName}: Inconsistencia crítica - status 'stable' con DUDAS TÉCNICAS`);
          score -= 20; // Penalización severa
        } else if (frontmatter.status === 'needs_review') {
          // Correcto, pero sigue siendo una advertencia
          issues.push(`⚠️ ${fileName}: Documento con dudas técnicas (correctamente marcado como needs_review)`);
        }
      }
    } catch (error) {
      issues.push(`🚨 ${fileName}: Error fatal al leer el archivo`);
    }

    // Normalizar score
    score = Math.max(0, Math.min(100, score));

    return {
      fileName,
      filePath,
      frontmatter,
      score,
      issues,
      isValid: issues.filter((i) => i.includes('🚨')).length === 0,
    };
  }

  /**
   * Genera las métricas completas leyendo el disco en tiempo real
   */
  public async getQualityMetrics(): Promise<DocumentationQualityMetrics> {
    const mdFiles = this.findMarkdownFiles(this.docsPath);

    const results = mdFiles.map((file) => this.validateDocument(file));

    // Calcular agregados
    let totalScore = 0;
    let formatErrorsCount = 0;
    let wipDocs = 0;
    let needsReviewDocs = 0;
    let stableDocs = 0;
    let warnings = 0;
    let criticalIssues = 0;

    // Listas exactas
    const wipDocsList: string[] = [];
    const needsReviewDocsList: string[] = [];
    const stableDocsList: string[] = [];
    const warningsListList: Array<{ component: string; warning: string }> = [];
    const formatErrorsList: Array<{
      component: string;
      error: string;
      filePath: string;
      fullError: string;
    }> = [];

    // Rastrear componentes documentados (UI y Backend)
    const documentedUiComponentPaths = new Set<string>();
    const documentedBackendComponentPaths = new Set<string>();

    results.forEach((res) => {
      totalScore += res.score;

      if (res.frontmatter.status === 'wip') {
        wipDocs++;
        wipDocsList.push(res.fileName);
      } else if (res.frontmatter.status === 'needs_review') {
        needsReviewDocs++;
        needsReviewDocsList.push(res.fileName);
      } else if (res.frontmatter.status === 'stable') {
        stableDocs++;
        stableDocsList.push(res.fileName);
      }

      // Rastrear el path que este documento dice cubrir (si aplica)
      if (res.frontmatter.location) {
        let loc = res.frontmatter.location.replace(/\\/g, '/');

        if (res.frontmatter.type === 'ui-component' || res.frontmatter.type === 'smart-component') {
          if (loc.includes('components/')) {
            loc = loc.split('components/')[1];
          }
          documentedUiComponentPaths.add(loc.toLowerCase());
        } else if (res.frontmatter.type === 'core' || res.frontmatter.type === 'subsystem') {
          if (loc.includes('apps/api/src/')) {
            loc = loc.split('apps/api/src/')[1];
          }
          documentedBackendComponentPaths.add(loc.toLowerCase());
        }
      }

      res.issues.forEach((issue) => {
        if (issue.includes('🚨')) {
          formatErrorsCount++;
          criticalIssues++;
          formatErrorsList.push({
            component: res.fileName,
            error: issue.replace(/🚨\s*[^:]+:\s*/, ''),
            filePath: res.filePath.split('FluxCoreChat')[1] || res.filePath,
            fullError: issue,
          });
        }
        if (issue.includes('⚠️')) {
          warnings++;
          warningsListList.push({
            component: res.fileName,
            warning: issue.replace(/⚠️\s*[^:]+:\s*/, ''),
          });
        }
      });
    });

    const averageQualityScore = results.length > 0 ? totalScore / results.length : 0;

    // Contar componentes dinámicamente
    const realUiComponentsPaths = this.findReactComponents();
    const realUiComponentsCount = realUiComponentsPaths.length;

    const realBackendComponentsPaths = this.findBackendComponents();
    const realBackendComponentsCount = realBackendComponentsPaths.length;

    // Calcular componentes no documentados
    const undocumentedComponents = realUiComponentsPaths.filter((path) => {
      const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
      return !Array.from(documentedUiComponentPaths).some((docPath) => {
        const normDocPath = docPath.replace(/\\/g, '/').toLowerCase();
        return normalizedPath.includes(normDocPath) || normDocPath.includes(normalizedPath);
      });
    });

    const undocumentedBackendComponents = realBackendComponentsPaths.filter((path) => {
      const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
      return !Array.from(documentedBackendComponentPaths).some((docPath) => {
        const normDocPath = docPath.replace(/\\/g, '/').toLowerCase();
        return normalizedPath.includes(normDocPath) || normDocPath.includes(normalizedPath);
      });
    });

    // Cuántos documentos tenemos específicamente
    const uiDocsCount = results.filter(
      (r) => r.frontmatter.type === 'ui-component' || r.frontmatter.type === 'smart-component'
    ).length;
    const backendDocsCount = results.filter(
      (r) => r.frontmatter.type === 'core' || r.frontmatter.type === 'subsystem'
    ).length;

    // Cálculo de Cobertura
    const uiCoverage =
      realUiComponentsCount > 0 ? Math.min(100, (uiDocsCount / realUiComponentsCount) * 100) : 0;
    const backendCoverage =
      realBackendComponentsCount > 0
        ? Math.min(100, (backendDocsCount / realBackendComponentsCount) * 100)
        : 0;

    // Confidence Index
    const perfectDocsCount = results.filter(
      (r) => r.frontmatter.status === 'stable' && r.issues.length === 0
    ).length;
    const confidenceIndex = results.length > 0 ? (perfectDocsCount / results.length) * 100 : 0;

    // Top 10 componentes por score
    const topComponents = [...results]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({ name: r.fileName.replace('.md', ''), score: r.score, issues: r.issues }));

    const returnMetrics = {
      // MÉTRICAS PRINCIPALES
      qualityScore: averageQualityScore,
      confidenceIndex: confidenceIndex,
      uiCoverage: uiCoverage,
      backendCoverage: backendCoverage,
      
      // DESGLOSE FÍSICO
      totalDocs: results.length,
      uiDocsCount: uiDocsCount,
      totalUiComponents: realUiComponentsCount,
      backendDocsCount: backendDocsCount,
      totalBackendComponents: realBackendComponentsCount,
      
      // ESTADOS DEL FRONTMATTER Y LISTAS
      wipDocs,
      needsReviewDocs,
      stableDocs,
      wipDocsList,
      needsReviewDocsList,
      stableDocsList,
      undocumentedComponents,
      undocumentedBackendComponents,

      // INCIDENCIAS
      criticalIssues,
      warnings,
      formatErrorsCount,
      
      // DETALLES
      lastUpdated: new Date().toISOString(),
      topComponents,
      formatErrors: formatErrorsList,
      warningsList: warningsListList,
    };

    // 🔄 ACTUALIZAR SNAPSHOT DINÁMICO PARA LA IA
    await this.updateDocumentationSnapshot(returnMetrics);
    
    return returnMetrics;
  }

  /**
   * Actualiza el documento snapshot con las métricas actuales para contexto de la IA
   */
  private async updateDocumentationSnapshot(metrics: DocumentationQualityMetrics): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    
    const snapshotPath = path.join(process.cwd(), '../../docs/reconstruction-phase-1/exhaustive-mapping/00-documentation-quality-snapshot.md');
    
    // Calcular porcentajes y métricas derivadas
    const stablePercentage = metrics.totalDocs > 0 ? (metrics.stableDocs / metrics.totalDocs * 100).toFixed(1) : '0.0';
    const needsReviewPercentage = metrics.totalDocs > 0 ? (metrics.needsReviewDocs / metrics.totalDocs * 100).toFixed(1) : '0.0';
    const wipPercentage = metrics.totalDocs > 0 ? (metrics.wipDocs / metrics.totalDocs * 100).toFixed(1) : '0.0';
    
    const undocumentedBackendPercentage = metrics.totalBackendComponents > 0 ? 
      (metrics.undocumentedBackendComponents.length / metrics.totalBackendComponents * 100).toFixed(1) : '0.0';
    const undocumentedUiPercentage = metrics.totalUiComponents > 0 ? 
      (metrics.undocumentedComponents.length / metrics.totalUiComponents * 100).toFixed(1) : '0.0';
    
    // Leer template existente
    let template = '';
    try {
      template = fs.readFileSync(snapshotPath, 'utf-8');
    } catch (error) {
      console.warn('[DocumentationQualityService] No se pudo leer el snapshot template:', error);
      return;
    }
    
    // Reemplazar placeholders con valores reales
    const updatedContent = template
      .replace(/{{TIMESTAMP}}/g, new Date().toLocaleString('es-ES', { 
        timeZone: 'America/Montevideo', 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }))
      .replace(/{{QUALITY_SCORE}}/g, String(metrics.qualityScore.toFixed(1)))
      .replace(/{{CONFIDENCE_INDEX}}/g, String(metrics.confidenceIndex.toFixed(1)))
      .replace(/{{TOTAL_DOCS}}/g, String(metrics.totalDocs))
      .replace(/{{UI_COVERAGE}}/g, String(metrics.uiCoverage.toFixed(1)))
      .replace(/{{UI_DOCS_COUNT}}/g, String(metrics.uiDocsCount))
      .replace(/{{TOTAL_UI_COMPONENTS}}/g, String(metrics.totalUiComponents))
      .replace(/{{BACKEND_COVERAGE}}/g, String(metrics.backendCoverage.toFixed(1)))
      .replace(/{{BACKEND_DOCS_COUNT}}/g, String(metrics.backendDocsCount))
      .replace(/{{TOTAL_BACKEND_COMPONENTS}}/g, String(metrics.totalBackendComponents))
      .replace(/{{STABLE_DOCS}}/g, String(metrics.stableDocs))
      .replace(/{{STABLE_PERCENTAGE}}/g, stablePercentage)
      .replace(/{{STABLE_DOCS_LIST}}/g, metrics.stableDocsList.slice(0, 10).join(', ') + 
        (metrics.stableDocsList.length > 10 ? ` (+${metrics.stableDocsList.length - 10} más)` : ''))
      .replace(/{{NEEDS_REVIEW_DOCS}}/g, String(metrics.needsReviewDocs))
      .replace(/{{NEEDS_REVIEW_PERCENTAGE}}/g, needsReviewPercentage)
      .replace(/{{NEEDS_REVIEW_DOCS_LIST}}/g, metrics.needsReviewDocsList.slice(0, 10).join(', ') + 
        (metrics.needsReviewDocsList.length > 10 ? ` (+${metrics.needsReviewDocsList.length - 10} más)` : ''))
      .replace(/{{WIP_DOCS}}/g, String(metrics.wipDocs))
      .replace(/{{WIP_PERCENTAGE}}/g, wipPercentage)
      .replace(/{{WIP_DOCS_LIST}}/g, metrics.wipDocsList.slice(0, 10).join(', ') + 
        (metrics.wipDocsList.length > 10 ? ` (+${metrics.wipDocsList.length - 10} más)` : ''))
      .replace(/{{UNDOCUMENTED_BACKEND_COUNT}}/g, String(metrics.undocumentedBackendComponents.length))
      .replace(/{{UNDOCUMENTED_BACKEND_PERCENTAGE}}/g, undocumentedBackendPercentage)
      .replace(/{{UNDOCUMENTED_BACKEND_LIST}}/g, metrics.undocumentedBackendComponents.slice(0, 15).join('\n- ') + 
        (metrics.undocumentedBackendComponents.length > 15 ? `\n- ... (+${metrics.undocumentedBackendComponents.length - 15} más)` : ''))
      .replace(/{{UNDOCUMENTED_UI_COUNT}}/g, String(metrics.undocumentedComponents.length))
      .replace(/{{UNDOCUMENTED_UI_PERCENTAGE}}/g, undocumentedUiPercentage)
      .replace(/{{UNDOCUMENTED_UI_LIST}}/g, metrics.undocumentedComponents.slice(0, 15).join('\n- ') + 
        (metrics.undocumentedComponents.length > 15 ? `\n- ... (+${metrics.undocumentedComponents.length - 15} más)` : ''))
      .replace(/{{CRITICAL_ISSUES}}/g, String(metrics.criticalIssues))
      .replace(/{{CRITICAL_ISSUE_TYPES}}/g, this.extractIssueTypes(metrics.formatErrors))
      .replace(/{{CRITICAL_COMPONENTS}}/g, metrics.formatErrors.slice(0, 5).map(e => e.component).join(', ') + 
        (metrics.formatErrors.length > 5 ? ` (+${metrics.formatErrors.length - 5} más)` : ''))
      .replace(/{{WARNINGS}}/g, String(metrics.warnings))
      .replace(/{{WARNING_TYPES}}/g, this.extractWarningTypes(metrics.warningsList))
      .replace(/{{WARNINGS_LIST}}/g, metrics.warningsList.slice(0, 10).map(w => `${w.component}: ${w.warning}`).join('\n- ') + 
        (metrics.warningsList.length > 10 ? `\n- ... (+${metrics.warningsList.length - 10} más)` : ''))
      .replace(/{{CORE_DOCS}}/g, String(metrics.backendDocsCount))
      .replace(/{{SMART_DOCS}}/g, String(metrics.uiDocsCount))
      .replace(/{{UI_DOCS}}/g, String(metrics.uiDocsCount))
      .replace(/{{DOCS_PER_DAY}}/g, '2.3') // TODO: Calcular dinámicamente
      .replace(/{{COMPLETION_RATE}}/g, String(((metrics.stableDocs / metrics.totalDocs) * 100).toFixed(1)))
      .replace(/{{AVG_TIME_PER_DOC}}/g, '4.5h') // TODO: Calcular dinámicamente
      .replace(/{{LAST_UPDATED}}/g, new Date().toLocaleDateString('es-ES'))
      .replace(/{{LAST_CHANGES}}/g, `Actualizado con ${metrics.totalDocs} documentos analizados`)
      .replace(/{{LAST_IMPACT}}/g, `${metrics.criticalIssues} errores críticos detectados`)
      .replace(/{{QUALITY_TREND}}/g, metrics.qualityScore >= 80 ? '📈 Mejorando' : metrics.qualityScore >= 60 ? '➡️ Estable' : '📉 Necesita atención')
      .replace(/{{UI_COVERAGE_TREND}}/g, metrics.uiCoverage >= 70 ? '📈 Buena cobertura' : '📉 Necesita trabajo')
      .replace(/{{BACKEND_COVERAGE_TREND}}/g, metrics.backendCoverage >= 70 ? '📈 Buena cobertura' : '📉 Necesita trabajo')
      .replace(/{{DOC_COMPONENT_RATIO}}/g, String(((metrics.totalDocs / (metrics.totalUiComponents + metrics.totalBackendComponents)) * 100).toFixed(1)))
      .replace(/{{SYSTEM_EFFICIENCY}}/g, String(((metrics.confidenceIndex + metrics.uiCoverage + metrics.backendCoverage) / 3).toFixed(1)));

    // Escribir archivo actualizado
    try {
      fs.writeFileSync(snapshotPath, updatedContent, 'utf-8');
      console.log('[DocumentationQualityService] ✅ Snapshot de documentación actualizado para contexto de IA');
    } catch (error) {
      console.error('[DocumentationQualityService] Error al actualizar snapshot:', error);
    }
  }

  /**
   * Extrae tipos de errores comunes de la lista de formatErrors
   */
  private extractIssueTypes(formatErrors: Array<{ component: string; error: string }>): string {
    const types = formatErrors.map(e => e.error.split(' ')[0]);
    const uniqueTypes = [...new Set(types)];
    return uniqueTypes.slice(0, 3).join(', ');
  }

  /**
   * Extrae tipos de advertencias comunes
   */
  private extractWarningTypes(warningsList: Array<{ component: string; warning: string }>): string {
    const types = warningsList.map(w => w.warning.split(' ')[0]);
    const uniqueTypes = [...new Set(types)];
    return uniqueTypes.slice(0, 3).join(', ');
  }
}

// Exportar una instancia singleton
export const documentationQualityService = new DocumentationQualityService();
