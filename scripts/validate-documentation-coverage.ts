#!/usr/bin/env bun

/**
 * validate-documentation-coverage.ts
 * 
 * Script de validación automática de cobertura de documentación
 * Ejecutar: bun run scripts/validate-documentation-coverage.ts
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import matter from 'gray-matter';

// Interfaz para el Frontmatter según AI_DOCUMENTATION_STANDARD
interface DocFrontmatter {
  id: string;
  type: 'core' | 'subsystem' | 'smart-component' | 'ui-component';
  status: 'wip' | 'stable' | 'needs_review' | 'deprecated';
  criticality: 'high' | 'medium' | 'low';
  location: string;
}

interface ValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
  componentScores: ComponentScore[];
}

interface ComponentScore {
  name: string;
  location: string;
  documented: boolean;
  score: number;
  issues: string[];
  frontmatter?: Partial<DocFrontmatter>;
}

class DocumentationValidator {
  private readonly basePath = 'docs/reconstruction-phase-1/exhaustive-mapping/01-ui-landscape';
  private readonly componentsPath = 'apps/web/src';
  
  async validateAll(): Promise<ValidationResult> {
    console.log('🔍 Iniciando validación de documentación...\n');
    
    const componentScores = await this.validateUIComponents();
    const issues = componentScores.flatMap(c => c.issues);
    const documentedCount = componentScores.filter(c => c.documented).length;
    const score = (documentedCount / componentScores.length) * 100;
    
    // Agregar validación de subsistemas y archivos adicionales
    const additionalDocs = this.validateAdditionalDocumentation();
    const totalDocumented = documentedCount + additionalDocs.count;
    const totalComponents = componentScores.length + additionalDocs.count;
    const finalScore = (totalDocumented / totalComponents) * 100;
    
    console.log(`📊 Componentes UI: ${documentedCount}/${componentScores.length}`);
    console.log(`📓 Docs adicionales: ${additionalDocs.count}`);
    console.log(`📈 Total documentados: ${totalDocumented}/${totalComponents}`);
    console.log(`🎯 Score final: ${finalScore.toFixed(1)}%\n`);
    
    const passed = finalScore >= 90 && issues.filter(i => i.startsWith('❌')).length === 0;
    const recommendations = this.generateRecommendations(finalScore, issues);
    
    return {
      passed,
      score: finalScore,
      issues,
      recommendations,
      componentScores
    };
  }
  
  private validateAdditionalDocumentation(): { count: number; files: string[] } {
    const additionalPatterns = [
      '*_SUBSYSTEM.md',      // TEMPLATES_SUBSYSTEM.md
      '*_CONFIG.md',         // FLUXCORE_TEMPLATE_CONFIG.md
      '*_PICKER.md',         // TEMPLATE_QUICK_PICKER.md
      '*_MAP.md',            // UI_COMPONENTS_MAP.md
      '*_HOOK.md',           // USE_CHAT_HOOK.md
      '*_ROUTING.md',        // APP_LAYOUT_ROUTING.md
      '*_SECTION.md',        // RAGCONFIGSECTION.md
      '*_DETAIL.md',         // ASSISTANTDETAIL.md
    ];
    
    let count = 0;
    const files: string[] = [];
    
    try {
      for (const pattern of additionalPatterns) {
        const result = execSync(
          `cmd /c "dir /b "${this.basePath}\\${pattern}" 2>nul"`,
          { encoding: 'utf8', maxBuffer: 1024 * 1024 }
        );
        
        const foundFiles = result
          .split('\n')
          .filter(f => f.trim())
          .map(f => f.trim());
        
        count += foundFiles.length;
        files.push(...foundFiles);
        
        if (foundFiles.length > 0) {
          console.log(`📄 Encontrados ${foundFiles.length} archivos con patrón ${pattern}:`, foundFiles.join(', '));
        }
      }
    } catch (error) {
      console.log('ℹ️ No se encontraron archivos adicionales con patrones específicos');
    }
    
    return { count, files };
  }
  
  private async validateUIComponents(): Promise<ComponentScore[]> {
    const components = this.discoverReactComponents();
    const scores: ComponentScore[] = [];
    
    console.log(`📦 Descubriendo componentes en ${this.componentsPath}...`);
    console.log(`   Encontrados: ${components.length} componentes\n`);
    
    for (const component of components) {
      const score = await this.validateComponent(component);
      scores.push(score);
    }
    
    return scores;
  }
  
  private discoverReactComponents(): string[] {
    try {
      // Usar comandos compatibles con Windows (cmd)
      const result = execSync(
        'cmd /c "dir /s /b apps\\web\\src\\*.tsx 2>nul"', 
        { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
      );
      
      console.log('   Resultado crudo de dir:');
      const lines = result.split('\n').slice(0, 10);
      console.log('   ', lines.join('\n   '));
      console.log('   Total líneas:', result.split('\n').length);
      
      const components = result
        .split('\n')
        .filter(path => {
          const trimmed = path.trim();
          return trimmed && trimmed.endsWith('.tsx');
        })
        .map(path => {
          // Extraer solo el nombre del archivo sin extensión
          const fileName = path.split(/[\/\\]/).pop() || '';
          // Limpiar caracteres de control como \r
          return fileName.replace('.tsx', '').replace(/\r/g, '');
        })
        .filter(name => !name.includes('.test') && !name.includes('.spec'));
      
      console.log(`   Componentes procesados: ${components.length}`);
      console.log('   Primeros componentes:', components.slice(0, 5));
      if (components.length > 0) {
        console.log(`   Ejemplos: ${components.slice(0, 5).join(', ')}${components.length > 5 ? '...' : ''}`);
      }
      
      return components;
    } catch (error) {
      console.error('❌ Error descubriendo componentes:', error);
      // Fallback a método manual si dir falla
      try {
        const result = execSync(
          'find apps/web/src -name "*.tsx" -type f 2>/dev/null', 
          { encoding: 'utf8', cwd: process.cwd() }
        );
        
        return result
          .split('\n')
          .filter(path => path.trim() && path.endsWith('.tsx'))
          .map(path => path.replace(/.*[\/\\]/, '').replace('.tsx', ''))
          .filter(name => !name.includes('.test') && !name.includes('.spec'));
      } catch (fallbackError) {
        console.error('❌ Error descubriendo componentes (fallback también falló):', fallbackError);
        return [];
      }
    }
  }
  
  private async validateComponent(componentName: string): Promise<ComponentScore> {
    const componentPath = this.findComponentPath(componentName);
    
    // Intentar múltiples posibles nombres de archivo .md
    const possibleDocNames = [
      `${componentName.toUpperCase()}.md`,           // TEMPLATE_MANAGER.md
      `${componentName.toLowerCase()}.md`,           // template_manager.md  
      `${componentName}.md`,                        // TemplateManager.md
      `${componentName.replace(/([A-Z])/g, '_$1').toLowerCase()}.md`, // Template_Manager.md
    ];
    
    let docPath = '';
    let documented = false;
    
    // Buscar el primer archivo .md que exista
    for (const possibleName of possibleDocNames) {
      const testPath = join(this.basePath, possibleName);
      if (existsSync(testPath)) {
        docPath = testPath;
        documented = true;
        break;
      }
    }
    
    const issues: string[] = [];
    let score = 0;
    
    // Verificar si existe documentación
    if (!documented) {
      issues.push(`❌ ${componentName}: Sin documentación (probado: ${possibleDocNames.join(', ')})`);
      return {
        name: componentName,
        location: componentPath,
        documented: false,
        score: 0,
        issues,
        frontmatter: {}
      };
    }
    
    // LEER CONTENIDO Y FRONTMATTER - 🚨 ERRORES RUIDOSOS
    const fileContent = readFileSync(docPath, 'utf8');
    let content = fileContent;
    let frontmatter: Partial<DocFrontmatter> = {};
    let hasFrontmatter = false;

    try {
      const parsed = matter(fileContent);
      if (Object.keys(parsed.data).length > 0) {
        frontmatter = parsed.data as Partial<DocFrontmatter>;
        content = parsed.content;
        hasFrontmatter = true;
      }
    } catch (e) {
      issues.push(`🚨 ${componentName}: Error al parsear Frontmatter YAML en ${docPath}`);
    }

    // 1. VALIDAR FRONTMATTER OBLIGATORIO
    if (!hasFrontmatter) {
      issues.push(`🚨 ${componentName}: Documento sin Frontmatter YAML (Ver AI_DOCUMENTATION_STANDARD.md)`);
      // Penalización fuerte por no tener frontmatter
      score -= 20; 
    } else {
      score += 20; // Premio por tener frontmatter
      
      // Validar campos requeridos del frontmatter
      if (!frontmatter.type) issues.push(`🚨 ${componentName}: Frontmatter sin campo 'type' (core | subsystem | smart-component | ui-component)`);
      if (!frontmatter.status) issues.push(`🚨 ${componentName}: Frontmatter sin campo 'status' (wip | stable | needs_review | deprecated)`);
      if (!frontmatter.location) issues.push(`🚨 ${componentName}: Frontmatter sin campo 'location'`);
      
      // Validar que el archivo existe
      if (frontmatter.location) {
        const fullLocation = resolve(process.cwd(), frontmatter.location);
        if (!existsSync(fullLocation)) {
          issues.push(`🚨 ${componentName}: El archivo especificado en 'location' no existe: ${frontmatter.location}`);
        }
      }
    }

    // 2. VALIDACIÓN ASIMÉTRICA POR TIERS
    const docType = frontmatter.type || 'unknown';

    if (docType === 'core' || docType === 'subsystem') {
      // TIER 1: Core & Subsistemas
      if (!content.match(/propósito|propósito:|🎯/i)) issues.push(`🚨 ${componentName} (Tier 1): Falta sección de Propósito`);
      if (!content.match(/arquitectura|flujo|estructura|🏗️/i)) issues.push(`� ${componentName} (Tier 1): Falta sección de Arquitectura/Flujo`);
      if (!content.match(/dependencias|consumido por|referencias/i)) issues.push(`🚨 ${componentName} (Tier 1): Falta sección de Dependencias`);
      score += 30; // Cumple al menos el intento de validación
    } 
    else if (docType === 'smart-component') {
      // TIER 2: Smart Components
      if (!content.match(/propósito|propósito:|🎯/i)) issues.push(`🚨 ${componentName} (Tier 2): Falta sección de Propósito`);
      if (!content.match(/estado|datos|hooks|use/i)) issues.push(`🚨 ${componentName} (Tier 2): Falta sección de Estado/Hooks`);
      if (!content.match(/flujo|interacción|eventos|click/i)) issues.push(`🚨 ${componentName} (Tier 2): Falta sección de Flujos de Interacción`);
      score += 30;
    }
    else if (docType === 'ui-component') {
      // TIER 3: UI Components
      if (!content.match(/propósito|propósito:|🎯/i)) issues.push(`🚨 ${componentName} (Tier 3): Falta sección de Propósito`);
      if (!content.match(/props|interfaz|interface|type/i)) issues.push(`🚨 ${componentName} (Tier 3): Falta definición de Props`);
      if (!content.match(/ejemplo|uso|```tsx|```jsx/i)) issues.push(`🚨 ${componentName} (Tier 3): Falta Ejemplo de Uso`);
      score += 30;
    }
    else if (docType === 'unknown' && !hasFrontmatter) {
    }

    // 3. REGLAS GENERALES
    if (content.includes('```typescript') || content.includes('```tsx')) {
      score += 10;
    } else {
      issues.push(`⚠️ ${componentName}: Sin ejemplos de código`);
    }

    // 4. PENALIZACIÓN POR DUDAS TÉCNICAS (Sincronizado con backend)
    if (content.includes('DUDA TÉCNICA') || content.includes('DUDAS TÉCNICAS')) {
      issues.push(`⚠️ ${componentName}: Contiene dudas técnicas no resueltas`);
      score -= 15; // Penalizamos el score
      
      if (frontmatter.status === 'stable') {
        issues.push(`🚨 ${componentName}: Tiene estado 'stable' pero contiene DUDAS TÉCNICAS. Debería ser 'needs_review'`);
      }
    }

    return {
      name: componentName,
      location: componentPath,
      documented: true,
      score: Math.max(0, Math.min(100, score)), // Asegurar que esté entre 0 y 100
      issues,
      frontmatter
    };
  }
  
  private findComponentPath(componentName: string): string {
    try {
      // Usar comandos compatibles con Windows
      const result = execSync(
        `cmd /c "dir /s /b apps\\web\\src\\${componentName}.tsx 2>nul"`,
        { encoding: 'utf8' }
      );
      return result.trim();
    } catch {
      return `apps/web/src/**/${componentName}.tsx`;
    }
  }
  
  private generateRecommendations(score: number, issues: string[]): string[] {
    const recommendations: string[] = [];
    const criticalIssues = issues.filter(i => i.startsWith('❌')).length;
    const warnings = issues.filter(i => i.startsWith('⚠️')).length;
    
    if (score >= 90) {
      recommendations.push('✅ Documentación en excelente estado');
    } else if (score >= 70) {
      recommendations.push('📈 Documentación buena, pero puede mejorar');
    } else {
      recommendations.push('🚨 Prioridad ALTA: Mejorar calidad de documentación');
    }
    
    if (criticalIssues > 0) {
      recommendations.push(`🔧 Resolver ${criticalIssues} issues críticos (falta documentación básica)`);
    }
    
    if (warnings > 10) {
      recommendations.push(`⚡ Mejorar detalles: Reducir ${warnings} advertencias`);
    }
    
    if (warnings > 0 && warnings <= 3) {
      recommendations.push('🎯 Casi perfecto: Resolver pocas advertencias restantes');
    }
    
    return recommendations;
  }
  
  async generateReport(result: ValidationResult): Promise<string> {
    const timestamp = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/Montevideo', 
      dateStyle: 'full', 
      timeStyle: 'medium' 
    });
    
    // Obtener documentos adicionales para el reporte
    const additionalDocs = this.validateAdditionalDocumentation();
    
    let report = `# 📊 Reporte de Calidad de Documentación UI\n\n`;
    report += `**Fecha:** ${timestamp}\n`;
    report += `**Score General:** ${result.score.toFixed(1)}%\n\n`;

    // Resumen
    const documented = result.componentScores.filter(c => c.documented).length;
    const formatErrors = result.issues.filter(i => i.includes('🚨'));
    const criticalIssues = result.issues.filter(i => i.startsWith('❌'));
    const warnings = result.issues.filter(i => i.startsWith('⚠️'));
    
    // Contar documentos por status del frontmatter
    const wipDocs = result.componentScores.filter(c => c.frontmatter?.status === 'wip').length;
    const needsReviewDocs = result.componentScores.filter(c => c.frontmatter?.status === 'needs_review').length;
    const stableDocs = result.componentScores.filter(c => c.frontmatter?.status === 'stable').length;

    report += `## 📈 Resumen\n\n`;
    report += `- **Componentes totales:** ${result.componentScores.length}\n`;
    report += `- **Componentes UI documentados:** ${documented}\n`;
    report += `- **Documentos adicionales:** ${additionalDocs.count}\n`;
    report += `- **Total documentados:** ${documented + additionalDocs.count}\n`;
    report += `- **Items totales:** ${result.componentScores.length + additionalDocs.count}\n`;
    report += `- **Issues críticos:** ${criticalIssues.length}\n`;
    report += `- **Documentos con formato inválido:** ${formatErrors.length}\n`;
    report += `- **Advertencias:** ${warnings.length}\n\n`;
    
    report += `### 📋 Estado de Documentos (Frontmatter)\n`;
    report += `- 🚧 **WIP (Trabajo en progreso):** ${wipDocs}\n`;
    report += `- 🚨 **Necesita Revisión:** ${needsReviewDocs}\n`;
    report += `- ✅ **Estable:** ${stableDocs}\n`;

    // Alerta si hay documentos inválidos
    if (formatErrors.length > 0) {
      report += `\n⚠️ **¡ALERTA!** Se detectaron ${formatErrors.length} documentos con formato inválido que requieren corrección inmediata.\n`;
    }
    
    // Top components
    report += `## 🏆 Top 10 Componentes (por score)\n\n`;
    const topComponents = result.componentScores
      .filter(c => c.documented)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    topComponents.forEach((comp, index) => {
      const emoji = comp.score >= 90 ? '🥇' : comp.score >= 80 ? '🥈' : comp.score >= 70 ? '🥉' : '📝';
      report += `${index + 1}. ${emoji} **${comp.name}** - ${comp.score.toFixed(1)}%\n`;
    });
    
    // Issues críticos
    if (criticalIssues.length > 0) {
      report += `\n## 🚨 Issues Críticos\n\n`;
      criticalIssues.forEach(issue => {
        report += `- ${issue}\n`;
      });
    }
    
    // Documentos con formato inválido - 🚨 ERRORES RUIDOSOS
    if (formatErrors.length > 0) {
      report += `\n## 🚨 Documentos con Formato Inválido\n\n`;
      report += `⚠️ **Se detectaron documentos que no cumplen con el formato oficial.**\n\n`;
      formatErrors.forEach(issue => {
        report += `- ${issue}\n`;
      });
      report += `\n🔍 **Acción requerida:** Corregir el formato de estos documentos para cumplir los estándares de documentación.\n`;
      report += `📋 **Formato requerido:** Debe incluir # Título, ## 🎯 Propósito, ## 🏗️ Arquitectura, **Ubicación:**, **Tamaño:**, **Propósito:**\n`;
    }
    
    // Advertencias
    if (warnings.length > 0) {
      report += `\n## ⚠️ Advertencias\n\n`;
      warnings.slice(0, 20).forEach(issue => {
        report += `- ${issue}\n`;
      });
      if (warnings.length > 20) {
        report += `- ... y ${warnings.length - 20} advertencias más\n`;
      }
    }
    
    // Recomendaciones
    if (result.recommendations.length > 0) {
      report += `\n## 💡 Recomendaciones\n\n`;
      result.recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
    }
    
    // Componentes sin documentar
    const undocumented = result.componentScores.filter(c => !c.documented);
    if (undocumented.length > 0) {
      report += `\n## 📝 Componentes sin Documentar\n\n`;
      undocumented.forEach(comp => {
        report += `- **${comp.name}** - \`${comp.location}\`\n`;
      });
    }
    
    return report;
  }
}

// Ejecución principal
async function main() {
  try {
    const validator = new DocumentationValidator();
    const result = await validator.validateAll();
    
    // Generar reporte
    const report = await validator.generateReport(result);
    
    // Guardar reporte
    const reportPath = 'docs/reconstruction-phase-1/exhaustive-mapping/01-ui-landscape/VALIDATION_REPORT.md';
    writeFileSync(reportPath, report, 'utf8');
    
    // Mostrar resumen en consola
    console.log('📊 Resultados de Validación:\n');
    console.log(`   Score: ${result.score.toFixed(1)}%`);
    console.log(`   Estado: ${result.passed ? '✅ APROBADO' : '❌ REQUIERE ATENCIÓN'}`);
    console.log(`   Components: ${result.componentScores.filter(c => c.documented).length}/${result.componentScores.length} documentados`);
    console.log(`   Issues: ${result.issues.length} encontrados`);
    
    if (result.issues.length > 0) {
    }
    
    console.log(`\n📄 Reporte completo guardado en: ${reportPath}`);
    
    // Guardar una copia en public para el frontend
    try {
      const publicPath = 'apps/web/public/VALIDATION_REPORT.md';
      writeFileSync(publicPath, report, 'utf8');
      console.log(`📄 Copia para dashboard web guardada en: ${publicPath}`);
    } catch (e) {
      console.warn('⚠️ No se pudo guardar copia en public:', e);
    }
    
    // Exit con código apropiado para CI/CD
    process.exit(result.passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error en validación:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validate-documentation-coverage.ts')) {
  main();
}

export { DocumentationValidator, type ValidationResult, type ComponentScore };
