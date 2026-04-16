import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, extname, resolve } from 'path';
import matter from 'gray-matter';

// Tipos extraídos del estándar AI_DOCUMENTATION_STANDARD.md
export interface DocFrontmatter {
  id?: string;
  type?: 'core' | 'subsystem' | 'smart-component' | 'ui-component' | 'backend-service' | 'unknown';
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
  
  // ✅ NUEVO: ESCENARIOS DE DESCUADRE (ORPHANS)
  orphanUiDocs: string[];
  orphanBackendDocs: string[];

  // INCIDENCIAS
  criticalIssues: number;
  warnings: number;
  formatErrorsCount: number;

  // DETALLES
  lastUpdated: string;
  topComponents: Array<{ name: string; score: number }>;
  formatErrors: Array<{ component: string; error: string; filePath: string; fullError: string }>;
  warningsList: Array<{ component: string; warning: string }>;
  autoCreatedCount: number;

  // ✅ NUEVO: VALIDACIÓN MATEMÁTICA (SSOT)
  mathematicalValidation: {
    isUiValid: boolean;
    isBackendValid: boolean;
    isConfidenceValid: boolean;
    details: string;
  };
}

export class DocumentationQualityService {
  // Ajustar la ruta relativa a desde donde se ejecuta el backend (usualmente la raíz del workspace si se usa turbo, o relativo a apps/api)
  // Asumimos que se puede resolver subiendo 2 niveles desde apps/api (hasta la raíz del monorepo)
  private get docsPath() {
    // Definimos la raíz subiendo desde apps/api/src/services/fluxcore
    const rootPath = join(__dirname, '../../../../..');
    return join(rootPath, 'docs/reconstruction-phase-1/exhaustive-mapping');
  }

  private get snapshotTemplatePath() {
    return join(this.docsPath, '00-SNAPSHOT.template.md');
  }

  private get snapshotOutputPath() {
    return join(this.docsPath, '00-SNAPSHOT.md');
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
    const rootPath = join(__dirname, '../../../../..');
    const componentsBasePath = join(rootPath, 'apps/web/src');

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
      'audit-',
      'debug-',
      'test-',
      'check-',
      'fix-',
      'verify-',
      '.stories.',
      '.d.ts'
    ];

    // ✅ NUEVO: Excluir archivos que no son componentes React
    const nonComponentPatterns = [
      'api.ts',
      'constants.ts',
      'types.ts',
      'store.ts',
      'routes.ts',
      'index.ts',
      'init.ts',
      'events.ts',
      'formatters.ts',
      'urls.ts',
      'uuid.ts',
      'utils.ts',
      'schema.ts',
      'theme.ts',
      'syncManager.ts',
      'syncQueue.ts',
      'MonitoringHub.tsx',
      'AccountDataAuditPanel.tsx',
      'AccountOrphanExplorer.tsx',
      'AssetMonitoringPanel.tsx',
      'SystemMonitor.tsx'
    ];

    const componentsList: string[] = [];

    // Función de escaneo recursivo sin fs externa extra (solo nativos)
    const scanDirectory = (dir: string, depth = 0) => {
      // Limitar profundidad para evitar scans infinitos
      if (depth > 5) return;

      try {
        if (!existsSync(dir)) return;
        const files = readdirSync(dir);

        for (const file of files) {
          const filePath = join(dir, file);
          const stat = statSync(filePath);

          // Skip non-component files in roots or with noise patterns
          if (depth === 0 && !file.includes('.') && file !== 'index.ts' && file !== 'server.ts' && file !== 'app.ts') {
            // It's a directory, allow it
          } else if (
            excludePatterns.some((pattern) => {
              if (pattern.includes('*')) {
                return file.includes(pattern.replace('*', ''));
              }
              return file.startsWith(pattern) || file === pattern || filePath.includes(pattern);
            }) ||
            nonComponentPatterns.some(pattern => file.includes(pattern))
          ) {
            continue;
          }

          if (stat.isDirectory()) {
            scanDirectory(filePath, depth + 1);
          } else if (stat.isFile()) {
            // ✅ CORRECCIÓN: Solo archivos .tsx (no .ts)
            const fileName = file.toLowerCase();

            if (
              fileName.endsWith('.tsx') &&  // ✅ Solo .tsx
              !fileName.includes('.test.') &&
              !fileName.includes('.spec.') &&
              !fileName.includes('.stories.') &&
              !fileName.endsWith('.d.ts')
            ) {
              // Lectura eficiente del archivo para validar si es un componente
              try {
                const content = readFileSync(filePath, 'utf-8');

                // ✅ CORRECCIÓN: Validación robusta pero selectiva para componentes UI
                const isReactComponent =
                  content.includes('export default') ||
                  content.includes('React.FC') ||
                  content.includes('React.forwardRef') ||
                  content.includes('useActionStore') || // Marcador específico de FluxCore Chat
                  (content.includes('return (') || content.includes('return <')) ||
                  content.includes('=> (') ||
                  content.includes('=> <');

                // ✅ CORRECCIÓN: Filtro de archivos estructurales vs componentes visuales
                const isUIFolder = 
                  filePath.includes('components') ||
                  filePath.includes('ui') ||
                  filePath.includes('widget') ||
                  filePath.includes('chat') ||
                  filePath.includes('layout') ||
                  filePath.includes('fluxcore') ||
                  filePath.includes('monitor') ||
                  filePath.includes('profile') ||
                  filePath.includes('extensions');

                // Excluir archivos puramente de datos/configuración que no son componentes
                const isNotPureData = 
                  !fileName.includes('.types.ts') &&
                  !fileName.includes('.styles.ts') &&
                  !fileName.includes('.constants.ts');

                if (isReactComponent && isUIFolder && isNotPureData) {
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

  // Helper para buscar dependencias leyendo AST en crudo
  private scanDependencies(filePath: string): string[] {
    try {
      if (!existsSync(filePath)) return [];
      const content = readFileSync(filePath, 'utf-8');
      const deps: string[] = [];
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('import') && line.includes('from')) {
          const match = line.match(/from\s+['"]([^'"]+)['"]/);
          if (match && match[1]) {
            if (match[1].startsWith('.') || match[1].startsWith('@')) {
               deps.push(match[1]);
            }
          }
        }
      }
      return deps;
    } catch {
      return [];
    }
  }

  // Helper para buscar dependientes (quién importa este archivo)
  private scanDependents(targetPath: string): string[] {
    const rootPath = join(__dirname, '../../../../..');
    const targetBaseName = targetPath.split(/[\\/]/).pop()?.replace('.ts', '').replace('.tsx', '') || '';
    if (!targetBaseName) return [];
    
    const dependents: string[] = [];
    const scanDir = (dir: string, depth = 0) => {
      if (depth > 6) return;
      try {
        if (!existsSync(dir)) return;
        const files = readdirSync(dir);
        for (const file of files) {
          const fullPath = join(dir, file);
          const stat = statSync(fullPath);
          if (stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
            scanDir(fullPath, depth + 1);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            if (fullPath === targetPath) continue;
            try {
              const content = readFileSync(fullPath, 'utf8');
              if (content.includes(`/${targetBaseName}`) || content.includes(`'${targetBaseName}'`) || content.includes(`"${targetBaseName}"`)) {
                 const rel = fullPath.replace(rootPath + '/', '').replace(rootPath + '\\', '').replace(/\\/g, '/');
                 dependents.push(rel);
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    };

    scanDir(join(rootPath, 'apps/api/src'));
    scanDir(join(rootPath, 'apps/web/src'));
    scanDir(join(rootPath, 'packages/db/src'));
    
    return dependents;
  }

  private findBackendComponents(): string[] {
    const rootPath = join(__dirname, '../../../../..');
    const apiBasePath = join(rootPath, 'apps/api/src');

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
      'audit-',
      'debug-',
      'test-',
      'check-',
      'fix-',
      'verify-',
      'compile-',
      'cleanup-',
      'find-',
      'capture-',
      'clear-',
      'diagnose-',
      '.stories.',
      'stories',
      'story'
    ];

    // ✅ NUEVO: Excluir archivos que no son servicios/rutas/core reales
    const nonServicePatterns = [
      'api.ts',
      'constants.ts',
      'types.ts',
      'index.ts',
      'init.ts',
      'events.ts',
      'formatters.ts',
      'urls.ts',
      'uuid.ts',
      'utils.ts',
      'schema.ts',
      'theme.ts',
      'middleware-index.ts',
      'routes-accounts.ts',
      'routes-relationships.ts',
      'routes-test.ts',
      'server.md',
      'health.md',
      'error-tracking.md',
      'logger.md',
      'redis-connection.md',
      'bullmq.md',
      'kernel-console.routes.ts'
    ];

    const componentsList: string[] = [];

    // ✅ CORRECCIÓN: Filtrar solo servicios/rutas/core relevantes

    const scanDirectory = (dir: string, depth = 0) => {
      if (depth > 5) return;

      try {
        if (!existsSync(dir)) return;

        const files = readdirSync(dir);

        for (const file of files) {
          const filePath = join(dir, file);
          const stat = statSync(filePath);

          if (
            excludePatterns.some((pattern) => file.includes(pattern) || filePath.includes(pattern)) ||
            nonServicePatterns.some(pattern => file.includes(pattern))
          ) {
            continue;
          }

          if (stat.isDirectory()) {
            scanDirectory(filePath, depth + 1);
          } else if (stat.isFile()) {
            const fileName = file.toLowerCase();

            if (fileName.endsWith('.ts') &&
                !fileName.includes('.test.') &&
                !fileName.includes('.spec.') &&
                !fileName.endsWith('.d.ts')) {
              // ✅ CORRECCIÓN: Asegurar que esté en directorios relevantes
              const relativePath =
                filePath.split('apps\\api\\src\\')[1] || filePath.split('apps/api/src/')[1] || file;
              const normalizedPath = relativePath.replace(/\\/g, '/');

              // ✅ CORRECCIÓN: Incluir solo servicios, rutas, core, middleware, workers, drivers relevantes
              // ✅ NUEVO: Excluir archivos que no son servicios/rutas/core reales
              // ✅ CORRECCIÓN: Definición estricta de "Servicio de Backend"
              const isRealService = 
                (normalizedPath.includes('services/') || 
                 normalizedPath.includes('routes/') || 
                 normalizedPath.includes('core/') ||
                 normalizedPath.includes('middleware/') ||
                 normalizedPath.includes('workers/') ||
                 normalizedPath.includes('drivers/')) &&
                !normalizedPath.includes('.test.') &&
                !normalizedPath.includes('.spec.') &&
                !normalizedPath.includes('.d.ts') &&
                !normalizedPath.includes('constants') &&
                !normalizedPath.includes('types');

              if (isRealService) {
                componentsList.push(normalizedPath);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[DocumentationQualityService] Could not scan directory: ${dir}`, error);
      }
    };

    scanDirectory(apiBasePath);

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

      // 2. Reglas por TIERS (Tipos)
      const isCoreSystemFile = fileName.startsWith('00-') || fileName === 'layer3_progress_tracker.md';

      if (docType === 'core' || docType === 'subsystem') {
        if (!content.match(/propósito|propósito:|🎯/i))
          issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Propósito`);
        
        // La arquitectura y dependencias solo son obligatorias para Subsistemas y Core que no sean meta-docs
        if (!isCoreSystemFile) {
          if (!content.match(/arquitectura|flujo|estructura|🏗️/i))
            issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Arquitectura/Flujo`);
          if (!content.match(/dependencias|consumido por|referencias/i))
            issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Dependencias`);
        }
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
      if (content.match(/```(typescript|tsx|markdown|json|text|sql|bash|yaml)/i)) {
        score += 10;
      } else {
        issues.push(`⚠️ ${fileName}: Sin ejemplos de código`);
      }

      // 4. Detección de Dudas Técnicas (regla crítica del estándar)
      // ✅ MEJORA: Remover bloques de código del texto a analizar para evitar falsos positivos
      const textToAnalyze = content.replace(/```[\s\S]*?```/g, '');

      let hasDoubts = false;
      if (isCoreSystemFile) {
        // En archivos base (00-*), solo si hay un header EXPLÍCITO de dudas/consultas
        // Esto evita que 00-PROMPT o 00-SNAPSHOT marquen error al citar la regla de "dudas técnicas"
        hasDoubts = !!textToAnalyze.match(/## ❓ Dudas Técnicas|## ❓ Consultas Técnicas/i);
      } else {
        // En el paisaje (código), evitamos palabras de uso común (verificar, confirmar) que causaban falsos positivos.
        // Solo buscamos menciones explícitas a dudas técnicas.
        hasDoubts = !!textToAnalyze.match(/duda técnica|dudas técnicas|## ❓ Dudas Técnicas/i);
      }

      if (hasDoubts) {
        issues.push(`🚨 ${fileName}: Contiene DUDAS TÉCNICAS - status debe ser 'needs_review'`);
        
        // Penalización extra si el frontmatter dice stable pero hay dudas
        if (frontmatter.status === 'stable') {
          issues.push(`🚨 ${fileName}: Inconsistencia crítica - status 'stable' con DUDAS TÉCNICAS`);
          score -= 40; // Penalización más severa como pidió el arquitecto
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

    // Rastrear el path que este documento dice cubrir (si aplica)
    const docsByPath = new Map<string, string>(); // Path -> DocFileName

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
        // Normalización SSOT
        const fullLoc = res.frontmatter.location.replace(/\\/g, '/').toLowerCase();
        const loc = fullLoc
          .replace('apps/web/src/', '')
          .replace('apps/api/src/', '')
          .replace('packages/db/src/', '')
          .replace(/^\//, ''); // Eliminar slash inicial si existe

        // Asignación inteligente por carpeta (SSOT)
        if (fullLoc.includes('apps/web/src') || res.filePath.includes('01-ui-landscape')) {
          documentedUiComponentPaths.add(loc);
          docsByPath.set(`ui:${loc}`, res.filePath);
        } else if (fullLoc.includes('apps/api/src') || res.filePath.includes('02-backend-landscape')) {
          documentedBackendComponentPaths.add(loc);
          docsByPath.set(`backend:${loc}`, res.filePath);
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
      return !documentedUiComponentPaths.has(normalizedPath);
    });

    const undocumentedBackendComponents = realBackendComponentsPaths.filter((path) => {
      const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
      return !documentedBackendComponentPaths.has(normalizedPath);
    });

    // ✅ NUEVO: IDENTIFICACIÓN DE HUÉRFANOS (Diferencia inversa)
    const orphanUiDocs: string[] = [];
    documentedUiComponentPaths.forEach(path => {
      if (!realUiComponentsPaths.map(p => p.replace(/\\/g, '/').toLowerCase()).includes(path)) {
        const docPath = docsByPath.get(`ui:${path}`);
        if (docPath) orphanUiDocs.push(docPath);
      }
    });

    const orphanBackendDocs: string[] = [];
    documentedBackendComponentPaths.forEach(path => {
      if (!realBackendComponentsPaths.map(p => p.replace(/\\/g, '/').toLowerCase()).includes(path)) {
        const docPath = docsByPath.get(`backend:${path}`);
        if (docPath) orphanBackendDocs.push(docPath);
      }
    });

    // ✅ CORRECCIÓN SSOT: Los conteos de documentos deben basarse en COBERTURA REAL, no en conteo de archivos físicos
    // Si hay más de un documento para el mismo path, o documentos sin path, el sistema debe ser determinista.
    // Cálculo de Cobertura Honesta (Caminos únicos reales que tienen un documento)
    const documentedUiUniquePaths = Array.from(documentedUiComponentPaths).length;
    const documentedBackendUniquePaths = Array.from(documentedBackendComponentPaths).length;

    // ✅ CORRECCIÓN SSOT: Los conteos de documentos deben basarse en COBERTURA REAL
    // Si hay más de un documento para el mismo path, o documentos sin path, el sistema debe ser determinista.
    const uiDocsCount = documentedUiUniquePaths;
    const backendDocsCount = documentedBackendUniquePaths;

    const uiCoverage =
      realUiComponentsCount > 0 ? Math.min(100, (documentedUiUniquePaths / realUiComponentsCount) * 100) : 0;
    const backendCoverage =
      realBackendComponentsCount > 0
        ? Math.min(100, (documentedBackendUniquePaths / realBackendComponentsCount) * 100)
        : 0;

    // Confidence Index
    const perfectDocsCount = results.filter(
      (r) => r.frontmatter.status === 'stable' && r.issues.length === 0
    ).length;
    const confidenceIndex = results.length > 0 ? (perfectDocsCount / results.length) * 100 : 0;

    // ✅ NUEVO: VALIDACIÓN MATEMÁTICA (SSOT)
    const isUiValid = documentedUiUniquePaths <= realUiComponentsCount && orphanUiDocs.length === 0;
    const isBackendValid = documentedBackendUniquePaths <= realBackendComponentsCount && orphanBackendDocs.length === 0;
    const isConfidenceValid = confidenceIndex <= 100 && averageQualityScore <= 100;
    
    const mathValidation = {
      isUiValid,
      isBackendValid,
      isConfidenceValid,
      details: `UI [Refs/Real]: ${documentedUiUniquePaths}/${realUiComponentsCount} (Huérfanos: ${orphanUiDocs.length}) | Backend [Refs/Real]: ${documentedBackendUniquePaths}/${realBackendComponentsCount} (Huérfanos: ${orphanBackendDocs.length})`
    };

    // Top 10 componentes por score
    const topComponents = [...results]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({ name: r.fileName.replace('.md', ''), score: r.score, issues: r.issues }));

    // 🚀 AUTO-DESCUBRIMIENTO DE CAPA 1 (GÉNESIS AUTOMÁTICA)
    let autoCreatedCount = 0;

    // Auto-generar para UI faltante
    undocumentedComponents.forEach(compPath => {
      const fileName = compPath.split('/').pop() || '';
      const name = fileName.replace('.tsx', '');
      const docPath = join(this.docsPath, '01-ui-landscape', `${name}.md`);
      
      const content = `---
id: "${name.toLowerCase().replace(/_/g, '-')}"
type: "ui-component"
status: "wip"
criticality: "medium"
location: "apps/web/src/${compPath}"

# 🎯 SISTEMA DE CAPAS
layers:
  discovery: { status: "complete", completed_date: "${new Date().toISOString().split('T')[0]}", confidence: 100, notes: "Auto-descubierto" }
  connections: { status: "pending", confidence: 0 }
  subsystem: { status: "pending", confidence: 0 }
  operations: { status: "pending", confidence: 0 }

evolution: { current_layer: 1, total_layers: 4, completion_percentage: 25 }
---

# 🤖 ${name}

Componente de UI auto-detectado. Requiere revisión de propósito y conexiones.
*(Fase 1: Descubrimiento Atómico completado)*.
`;
      if (!existsSync(docPath)) {
        writeFileSync(docPath, content);
        autoCreatedCount++;
      }
    });

    // Auto-generar para Backend faltante
    undocumentedBackendComponents.forEach(compPath => {
      // 🛡️ NAMING SIN COLISIONES: Usamos el path relativo completo para evitar duplicados como index.md
      const docName = compPath
        .replace(/\//g, '-')
        .replace(/\\/g, '-')
        .replace('.ts', '')
        .replace('.service', '')
        .replace('.routes', '')
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/\./g, '-');
        
      const docPath = join(this.docsPath, '02-backend-landscape', `${docName}.md`);

      const content = `---
id: "${docName}"
type: "backend-service"
status: "wip"
criticality: "medium"
location: "apps/api/src/${compPath}"

# 🎯 SISTEMA DE CAPAS
layers:
  discovery: { status: "complete", completed_date: "${new Date().toISOString().split('T')[0]}", confidence: 100, notes: "Auto-descubierto" }
  connections: { status: "pending", confidence: 0 }
  subsystem: { status: "pending", confidence: 0 }
  operations: { status: "pending", confidence: 0 }

evolution: { current_layer: 1, total_layers: 4, completion_percentage: 25 }
---

# 🤖 ${docName}

Servicio/Ruta de Backend auto-detectado. 
**Ubicación Real:** \`apps/api/src/${compPath}\`

## 🎯 Propósito
Módulo detectado en la Fase 1 de descubrimiento atómico. Requiere revisión de arquitectura.
`;
      if (!existsSync(docPath)) {
        writeFileSync(docPath, content);
        autoCreatedCount++;
      }
    });

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
      orphanUiDocs,
      orphanBackendDocs,

      // INCIDENCIAS
      criticalIssues,
      warnings,
      formatErrorsCount,
      
      // DETALLES
      lastUpdated: new Date().toISOString(),
      topComponents,
      formatErrors: formatErrorsList,
      warningsList: warningsListList,
      autoCreatedCount,
      mathematicalValidation: mathValidation
    };

    // 🔄 ACTUALIZAR SNAPSHOT DINÁMICO PARA LA IA
    await this.updateDocumentationSnapshot(returnMetrics);
    
    // ✅ AUTO-LIMPIEZA DE HUÉRFANOS (Regla de Arquitecto)
    if (!isUiValid || !isBackendValid) {
       console.log(`[DocumentationQualityService] 🚨 Detectados huérfanos (${orphanUiDocs.length} UI, ${orphanBackendDocs.length} Backend). Ejecutando purga SSOT...`);
       this.cleanupOrphans(orphanUiDocs, orphanBackendDocs);
       // Re-ejecutamos para obtener métricas limpias
       return this.getQualityMetrics(); 
    }

    return returnMetrics;
  }

  /**
   * Elimina archivos de documentación que ya no tienen contraparte en el código
   */
  private cleanupOrphans(uiOrphans: string[], backendOrphans: string[]): void {
    const allOrphans = [...uiOrphans, ...backendOrphans];
    
    // ✅ NUEVO: Detectar duplicados y docs de paisaje sin ubicación
    const mdFiles = this.findMarkdownFiles(this.docsPath);
    const seenPaths = new Set<string>();
    
    mdFiles.forEach(file => {
      try {
        const content = readFileSync(file, 'utf8');
        const parsed = matter(content);
        const type = parsed.data.type;
        const location = parsed.data.location;
        
        // 1. Docs de paisaje sin ubicación (excepto core)
        if (['ui-component', 'smart-component', 'backend-service', 'core', 'subsystem'].includes(type) && !location) {
          if (!['00-INDEX.md', '00-PROMPT.md', '00-SNAPSHOT.md', '00-STANDARD.md', 'layer3_progress_tracker.md'].includes(file.split(/[\\/]/).pop() || '')) {
             allOrphans.push(file);
          }
        }
        
        // 2. Duplicados
        if (location) {
          const normLoc = location.toLowerCase().replace(/\\/g, '/');
          if (seenPaths.has(normLoc)) {
            allOrphans.push(file); // Marcar duplicado para borrado
          } else {
            seenPaths.add(normLoc);
          }
        }
      } catch (e) {}
    });

    // Lista de exclusión crítica (WhiteList)
    const protectedFiles = ['00-INDEX.md', '00-PROMPT.md', '00-SNAPSHOT.md', '00-SNAPSHOT.template.md', '00-STANDARD.md', 'layer3_progress_tracker.md'];

    allOrphans.forEach(filePath => {
      const fileName = filePath.split(/[\\/]/).pop() || '';
      if (protectedFiles.includes(fileName)) {
        return; // No tocar archivos core
      }
      
      try {
        if (existsSync(filePath)) {
          console.log(`[DocumentationQualityService] 🗑️ Eliminando inconsistencia SSOT: ${filePath}`);
          require('fs').unlinkSync(filePath);
        }
      } catch (e) {
        console.warn(`[DocumentationQualityService] Error eliminando ${filePath}`, e);
      }
    });
  }

  /**
   * Actualiza el documento snapshot con las métricas actuales para contexto de la IA
   */
  private async updateDocumentationSnapshot(metrics: DocumentationQualityMetrics): Promise<void> {
    const snapshotPath = this.snapshotOutputPath;
    const templatePath = this.snapshotTemplatePath;
    
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
      template = readFileSync(templatePath, 'utf-8');
    } catch (error) {
      console.warn('[DocumentationQualityService] No se pudo leer el snapshot template:', error);
      // Fallback a intentar leer el archivo actual si no hay template
      try {
        template = readFileSync(snapshotPath, 'utf-8');
      } catch (e) {
        return;
      }
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
      .replace(/{{DOCS_PER_DAY}}/g, 'Calculado en tiempo real') 
      .replace(/{{COMPLETION_RATE}}/g, String(((metrics.stableDocs / metrics.totalDocs) * 100).toFixed(1)))
      .replace(/{{AVG_TIME_PER_DOC}}/g, 'Variable según complejidad') 
      .replace(/{{LAST_UPDATED}}/g, new Date().toLocaleDateString('es-ES'))
      .replace(/{{LAST_CHANGES}}/g, `Actualizado con ${metrics.totalDocs} documentos analizados`)
      .replace(/{{LAST_IMPACT}}/g, `${metrics.criticalIssues} errores críticos detectados`)
      .replace(/{{QUALITY_TREND}}/g, metrics.qualityScore >= 80 ? '📈 Mejorando' : metrics.qualityScore >= 60 ? '➡️ Estable' : '📉 Necesita atención')
      .replace(/{{UI_COVERAGE_TREND}}/g, metrics.uiCoverage >= 70 ? '📈 Buena cobertura' : '📉 Necesita trabajo')
      .replace(/{{BACKEND_COVERAGE_TREND}}/g, metrics.backendCoverage >= 70 ? '📈 Buena cobertura' : '📉 Necesita trabajo')
      .replace(/{{DOC_COMPONENT_RATIO}}/g, String(((metrics.totalDocs / (metrics.totalUiComponents + metrics.totalBackendComponents)) * 100).toFixed(1)))
      .replace(/{{SYSTEM_EFFICIENCY}}/g, String(((metrics.confidenceIndex + metrics.uiCoverage + metrics.backendCoverage) / 3).toFixed(1)))
      // ✅ NUEVO: PLACEHOLDERS MATEMÁTICOS
      .replace(/{{MATH_UI}}/g, metrics.mathematicalValidation.isUiValid ? '✅ Válido' : '❌ Inconsistente')
      .replace(/{{MATH_BACKEND}}/g, metrics.mathematicalValidation.isBackendValid ? '✅ Válido' : '❌ Inconsistente')
      .replace(/{{MATH_DETAILS}}/g, metrics.mathematicalValidation.details);

    try {
      writeFileSync(snapshotPath, updatedContent, 'utf-8');
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
   * 🏗️ CAPACIDAD INSTALADA: AUTO-BUILD LAYER 2
   * Lee mecánicamente las importaciones (AST) y actualiza los documentos
   * No daña información existente, solo añade la capa mecánica de Connections.
   */
  public async buildLayer2Connections(): Promise<{ uiProcessed: number, backendProcessed: number }> {
    const mdFiles = this.findMarkdownFiles(this.docsPath);
    let uiProcessed = 0;
    let backendProcessed = 0;
    const rootPath = join(__dirname, '../../../../..');

    console.log('[DocumentationQualityService] 🚀 Iniciando Auto-Build Capa 2 (Connections)');

    for (const docPath of mdFiles) {
      try {
        const fileContent = readFileSync(docPath, 'utf8');
        const parsed = matter(fileContent);

        if (!parsed.data.location || parsed.data.status === 'deprecated') continue;
        
        // Evitamos sobreescribir si ya tiene sección manual de Capa 2
        if (parsed.content.includes('## 🔗 Capa 2: Conexiones e Interdependencias')) {
           continue; 
        }

        let location = parsed.data.location;
        if (location.includes('C:/') || location.includes('C:\\')) {
           location = location.split('FluxCoreChat/FluxCoreChat/')[1] || location.split('FluxCoreChat\\\\FluxCoreChat\\\\')[1] || location;
        }
        
        const realLocationPath = resolve(rootPath, location);
        const frontmatterMatch = fileContent.match(/---[\\s\\S]*?---/);
        if (!frontmatterMatch) continue;
        let newFrontmatter = frontmatterMatch[0];

        // Solo procesamos si está en pending y no fue escrito por humanos
        if (newFrontmatter.includes('connections:') && newFrontmatter.includes('status: "pending"')) {
           newFrontmatter = newFrontmatter.replace(/connections:\\s*(?:#.*)?\\s*status: "pending"\\s*confidence: 0/, 'connections:         # Capa 2: Conexiones e Interdependencias\\n    status: "complete"\\n    confidence: 100\\n    notes: "Auto-descubierto por AST"');
           newFrontmatter = newFrontmatter.replace(/connections:\\s*\\{[^}]+\\}/, 'connections: { status: "complete", confidence: 100, notes: "Auto-descubierto por AST" }');
           
           newFrontmatter = newFrontmatter.replace(/current_layer: 1/, 'current_layer: 2');
           newFrontmatter = newFrontmatter.replace(/completion_percentage: 25/, 'completion_percentage: 50');
           newFrontmatter = newFrontmatter.replace(/next_milestone: "connections"/, 'next_milestone: "subsystem"');
        } else {
           continue; // Si ya fue alterado, lo saltamos
        }

        let depsStr = '## 🔗 Capa 2: Conexiones e Interdependencias\\n\\n';
        if (existsSync(realLocationPath)) {
            const deps = this.scanDependencies(realLocationPath);
            const dependents = this.scanDependents(realLocationPath);
            
            depsStr += '### 📦 Dependencias (LO QUE CONSUME)\\n';
            if (deps.length > 0) {
              depsStr += deps.map(d => `- \`${d}\``).join('\\n') + '\\n';
            } else {
              depsStr += '- *No tiene dependencias internas significativas*\\n';
            }
            
            depsStr += '\\n### 🔄 Dependientes (QUIÉN LO CONSUME)\\n';
            if (dependents.length > 0) {
              depsStr += dependents.map(d => `- \`${d}\``).join('\\n') + '\\n';
            } else {
              depsStr += '- *No hay consumidores detectados o es un entry point*\\n';
            }
        } else {
            depsStr += '*Nota: El archivo fuente no pudo ser encontrado.*';
        }

        const updatedContent = fileContent.replace(frontmatterMatch[0], newFrontmatter) + '\\n\\n' + depsStr;
        writeFileSync(docPath, updatedContent, 'utf8');

        if (docPath.includes('01-ui-landscape')) uiProcessed++;
        if (docPath.includes('02-backend-landscape')) backendProcessed++;
      } catch (e) {
        console.warn(`[DocumentationQualityService] Error procesando Capa 2 para ${docPath}`, e);
      }
    }

    return { uiProcessed, backendProcessed };
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
