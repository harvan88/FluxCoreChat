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
  totalDocs: number;
  documentedComponents: number;
  totalComponents: number; // Estimado o contado estáticamente
  score: number;
  criticalIssues: number;
  warnings: number;
  formatErrorsCount: number;
  wipDocs: number;
  needsReviewDocs: number;
  stableDocs: number;
  lastUpdated: string;
  topComponents: Array<{ name: string; score: number }>;
  formatErrors: Array<{ component: string; error: string; filePath: string; fullError: string }>;
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
        issues.push(`🚨 ${fileName}: Documento sin Frontmatter YAML (Ver AI_DOCUMENTATION_STANDARD)`);
      } else {
        score += 20;
        if (!frontmatter.type) issues.push(`🚨 ${fileName}: Frontmatter sin campo 'type'`);
        if (!frontmatter.status) issues.push(`🚨 ${fileName}: Frontmatter sin campo 'status'`);
        if (!frontmatter.location) issues.push(`🚨 ${fileName}: Frontmatter sin campo 'location'`);
      }

      // 2. Validación Asimétrica (Tiers)
      const docType = frontmatter.type || 'unknown';

      if (docType === 'core' || docType === 'subsystem') {
        if (!content.match(/propósito|propósito:|🎯/i)) issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Propósito`);
        if (!content.match(/arquitectura|flujo|estructura|🏗️/i)) issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Arquitectura/Flujo`);
        if (!content.match(/dependencias|consumido por|referencias/i)) issues.push(`🚨 ${fileName} (Tier 1): Falta sección de Dependencias`);
        score += 30;
      } 
      else if (docType === 'smart-component') {
        if (!content.match(/propósito|propósito:|🎯/i)) issues.push(`🚨 ${fileName} (Tier 2): Falta sección de Propósito`);
        if (!content.match(/estado|datos|hooks|use/i)) issues.push(`🚨 ${fileName} (Tier 2): Falta sección de Estado/Hooks`);
        if (!content.match(/flujo|interacción|eventos|click/i)) issues.push(`🚨 ${fileName} (Tier 2): Falta sección de Flujos de Interacción`);
        score += 30;
      }
      else if (docType === 'ui-component') {
        if (!content.match(/propósito|propósito:|🎯/i)) issues.push(`🚨 ${fileName} (Tier 3): Falta sección de Propósito`);
        if (!content.match(/props|interfaz|interface|type/i)) issues.push(`🚨 ${fileName} (Tier 3): Falta definición de Props`);
        if (!content.match(/ejemplo|uso|```tsx|```jsx/i)) issues.push(`🚨 ${fileName} (Tier 3): Falta Ejemplo de Uso`);
        score += 30;
      }
      else {
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
      isValid: issues.filter(i => i.includes('🚨')).length === 0
    };
  }

  /**
   * Genera las métricas completas leyendo el disco en tiempo real
   */
  public async getQualityMetrics(): Promise<DocumentationQualityMetrics> {
    const mdFiles = this.findMarkdownFiles(this.docsPath);
    
    const results = mdFiles.map(file => this.validateDocument(file));
    
    // Calcular agregados
    let totalScore = 0;
    let formatErrorsCount = 0;
    let wipDocs = 0;
    let needsReviewDocs = 0;
    let stableDocs = 0;
    let warnings = 0;
    let criticalIssues = 0;
    const formatErrorsList: Array<{ component: string; error: string; filePath: string; fullError: string }> = [];

    results.forEach(res => {
      totalScore += res.score;
      
      if (res.frontmatter.status === 'wip') wipDocs++;
      if (res.frontmatter.status === 'needs_review') needsReviewDocs++;
      if (res.frontmatter.status === 'stable') stableDocs++;

      res.issues.forEach(issue => {
        if (issue.includes('🚨')) {
          formatErrorsCount++;
          criticalIssues++;
          formatErrorsList.push({
            component: res.fileName,
            error: issue.replace(/🚨\s*[^:]+:\s*/, ''),
            filePath: res.filePath.split('FluxCoreChat')[1] || res.filePath,
            fullError: issue
          });
        }
        if (issue.includes('⚠️')) {
          warnings++;
        }
      });
    });

    const averageScore = results.length > 0 ? (totalScore / results.length) : 0;

    // Top 10 componentes por score (descendente)
    const topComponents = [...results]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => ({ name: r.fileName.replace('.md', ''), score: r.score }));

    return {
      totalDocs: results.length,
      documentedComponents: results.length, // Cada doc cuenta como un componente documentado por ahora
      totalComponents: 168, // Hardcodeado por ahora basado en el script original, idealmente debería escanear apps/web/src
      score: averageScore,
      criticalIssues,
      warnings,
      formatErrorsCount,
      wipDocs,
      needsReviewDocs,
      stableDocs,
      lastUpdated: new Date().toISOString(),
      topComponents,
      formatErrors: formatErrorsList
    };
  }
}

// Exportar una instancia singleton
export const documentationQualityService = new DocumentationQualityService();
