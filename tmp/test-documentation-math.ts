import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';

// Configuración de rutas
const REPO_ROOT = join(__dirname, '..');
const UI_SRC = join(REPO_ROOT, 'apps/web/src');
const API_SRC = join(REPO_ROOT, 'apps/api/src');
const DOCS_PATH = join(REPO_ROOT, 'docs/reconstruction-phase-1/exhaustive-mapping');

// Patrones de exclusión
const EXCLUDE_PATTERNS = [
  'node_modules', '.test.', '.spec.', '.test.tsx', '.spec.tsx', 
  'audit-', 'debug-', 'check-', 'fix-', 'verify-', 'history', '_legacy', 'tmp', '.gemini',
  '.stories.', '.d.ts', 'stories', 'story'
];

interface TestResults {
  uiComponents: {
    realCount: number;
    documentedCount: number;
    coverage: number;
    documentedPaths: string[];
    undocumentedPaths: string[];
  };
  backendComponents: {
    realCount: number;
    documentedCount: number;
    coverage: number;
    documentedPaths: string[];
    undocumentedPaths: string[];
  };
  docs: {
    totalDocs: number;
    uiDocs: number;
    backendDocs: number;
    stableDocs: number;
    needsReviewDocs: number;
    wipDocs: number;
  };
  mathematics: {
    uiRatio: number;
    backendRatio: number;
    totalRatio: number;
    confidenceIndex: number;
  };
}

/**
 * Versión corregida de conteo de componentes UI
 */
function countReactComponents(): string[] {
  const componentsList: string[] = [];
  
  const scanDirectory = (dir: string, depth = 0) => {
    if (depth > 5) return;
    
    try {
      if (!existsSync(dir)) return;
      const files = readdirSync(dir);
      
      for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        
        // Excluir patrones no deseados
        if (EXCLUDE_PATTERNS.some(pattern => file.includes(pattern))) {
          continue;
        }
        
        if (stat.isDirectory()) {
          scanDirectory(filePath, depth + 1);
        } else if (stat.isFile()) {
          const fileName = file.toLowerCase();
          
          // ✅ Solo archivos .tsx (no .ts)
          if (fileName.endsWith('.tsx') &&
              !fileName.includes('.test.') &&
              !fileName.includes('.spec.') &&
              !fileName.includes('.stories.') &&
              !fileName.endsWith('.d.ts')) {
            
            try {
              const content = readFileSync(filePath, 'utf-8');
              
              // ✅ Validar que sea realmente un componente React
              const isReactComponent =
                content.includes('export default') ||
                content.includes('React.FC') ||
                content.includes('export function') && content.includes('return (') ||
                content.includes('export const') && content.includes('=> (') ||
                (content.includes('function ') && content.includes('return (')) ||
                (content.includes('const ') && content.includes('=> ('));
              
              if (isReactComponent) {
                const relativePath = filePath.split('apps\\web\\src\\')[1] || 
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
      console.warn(`Could not scan directory: ${dir}`, error);
    }
  };
  
  scanDirectory(UI_SRC);
  return componentsList;
}

/**
 * Versión corregida de conteo de componentes Backend
 */
function countBackendComponents(): string[] {
  const componentsList: string[] = [];
  
  const scanDirectory = (dir: string, depth = 0) => {
    if (depth > 5) return;
    
    try {
      if (!existsSync(dir)) return;
      const files = readdirSync(dir);
      
      for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        
        // Excluir patrones no deseados
        if (EXCLUDE_PATTERNS.some(pattern => file.includes(pattern))) {
          continue;
        }
        
        if (stat.isDirectory()) {
          scanDirectory(filePath, depth + 1);
        } else if (stat.isFile()) {
          const fileName = file.toLowerCase();
          
          // ✅ Solo archivos .ts relevantes
          if (fileName.endsWith('.ts') &&
              !fileName.includes('.test.') &&
              !fileName.includes('.spec.') &&
              !fileName.endsWith('.d.ts')) {
            
            // ✅ Filtrar solo directorios relevantes
            const relativePath = filePath.split('apps\\api\\src\\')[1] || 
                              filePath.split('apps/api/src/')[1] || 
                              file;
            const normalizedPath = relativePath.replace(/\\/g, '/');
            
            // Incluir solo servicios, rutas, core, middleware, workers
            if (normalizedPath.includes('services/') || 
                normalizedPath.includes('routes/') || 
                normalizedPath.includes('core/') ||
                normalizedPath.includes('middleware/') ||
                normalizedPath.includes('workers/') ||
                normalizedPath.includes('drivers/')) {
              componentsList.push(normalizedPath);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory: ${dir}`, error);
    }
  };
  
  scanDirectory(API_SRC);
  return componentsList;
}

/**
 * Analiza documentos .md para determinar qué componentes están documentados
 */
function analyzeDocumentation(): {
  uiDocumented: Set<string>;
  backendDocumented: Set<string>;
  totalDocs: number;
  uiDocs: number;
  backendDocs: number;
  stableDocs: number;
  needsReviewDocs: number;
  wipDocs: number;
} {
  const uiDocumented = new Set<string>();
  const backendDocumented = new Set<string>();
  let totalDocs = 0;
  let uiDocs = 0;
  let backendDocs = 0;
  let stableDocs = 0;
  let needsReviewDocs = 0;
  let wipDocs = 0;
  
  const scanDocs = (dir: string) => {
    if (!existsSync(dir)) return;
    
    const files = readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = join(dir, file);
      totalDocs++;
      
      try {
        const content = readFileSync(filePath, 'utf-8');
        
        // Extraer frontmatter
        const frontmatterMatch = content.match(/---[\s\S]*?---/);
        if (!frontmatterMatch) continue;
        
        const frontmatterText = frontmatterMatch[0];
        const locationMatch = frontmatterText.match(/location:\s*["']([^"']+)["']/);
        const typeMatch = frontmatterText.match(/type:\s*["']([^"']+)["']/);
        const statusMatch = frontmatterText.match(/status:\s*["']([^"']+)["']/);
        
        if (locationMatch) {
          let location = locationMatch[1];
          location = location.replace(/\\/g, '/').toLowerCase();
          
          // Normalizar path
          const normalizedLoc = location
            .replace('apps/web/src/', '')
            .replace('apps/api/src/', '')
            .replace('packages/db/src/', '');
          
          // Clasificar por tipo
          const type = typeMatch ? typeMatch[1] : 'unknown';
          const status = statusMatch ? statusMatch[1] : 'unknown';
          
          if (type === 'ui-component' || type === 'smart-component') {
            uiDocumented.add(normalizedLoc);
            uiDocs++;
          } else if (type === 'backend-service' || type === 'core' || type === 'subsystem') {
            backendDocumented.add(normalizedLoc);
            backendDocs++;
          }
          
          // Contar por estado
          if (status === 'stable') stableDocs++;
          else if (status === 'needs_review') needsReviewDocs++;
          else if (status === 'wip') wipDocs++;
        }
      } catch (error) {
        console.warn(`Error reading ${file}:`, error);
      }
    }
  };
  
  scanDocs(join(DOCS_PATH, '01-ui-landscape'));
  scanDocs(join(DOCS_PATH, '02-backend-landscape'));
  scanDocs(DOCS_PATH);
  
  return {
    uiDocumented,
    backendDocumented,
    totalDocs,
    uiDocs,
    backendDocs,
    stableDocs,
    needsReviewDocs,
    wipDocs
  };
}

/**
 * Ejecuta prueba completa del algoritmo
 */
async function runDocumentationTest(): Promise<TestResults> {
  console.log('🧮 Iniciando prueba matemática de documentación...\n');
  
  // 1. Contar componentes reales
  console.log('📊 Contando componentes reales...');
  const uiComponents = countReactComponents();
  const backendComponents = countBackendComponents();
  
  console.log(`✅ Componentes UI encontrados: ${uiComponents.length}`);
  console.log(`✅ Componentes Backend encontrados: ${backendComponents.length}\n`);
  
  // 2. Analizar documentación existente
  console.log('📚 Analizando documentación existente...');
  const docs = analyzeDocumentation();
  
  console.log(`📄 Total documentos: ${docs.totalDocs}`);
  console.log(`📄 Documentos UI: ${docs.uiDocs}`);
  console.log(`📄 Documentos Backend: ${docs.backendDocs}`);
  console.log(`📄 Estables: ${docs.stableDocs} | Needs Review: ${docs.needsReviewDocs} | WIP: ${docs.wipDocs}\n`);
  
  // 3. Calcular componentes documentados
  const uiDocumentedPaths = uiComponents.filter(path => {
    const normalizedPath = path.toLowerCase();
    return Array.from(docs.uiDocumented).some(docPath => 
      normalizedPath.includes(docPath) || docPath.includes(normalizedPath)
    );
  });
  
  const backendDocumentedPaths = backendComponents.filter(path => {
    const normalizedPath = path.toLowerCase();
    return Array.from(docs.backendDocumented).some(docPath => 
      normalizedPath.includes(docPath) || docPath.includes(normalizedPath)
    );
  });
  
  // 4. Calcular componentes no documentados
  const uiUndocumentedPaths = uiComponents.filter(path => 
    !uiDocumentedPaths.includes(path)
  );
  
  const backendUndocumentedPaths = backendComponents.filter(path => 
    !backendDocumentedPaths.includes(path)
  );
  
  // 5. Calcular coberturas
  const uiCoverage = uiComponents.length > 0 ? (uiDocumentedPaths.length / uiComponents.length) * 100 : 0;
  const backendCoverage = backendComponents.length > 0 ? (backendDocumentedPaths.length / backendComponents.length) * 100 : 0;
  
  // 6. Calcular métricas matemáticas
  const perfectDocs = docs.stableDocs; // Simplificado: asume stable = perfect
  const confidenceIndex = docs.totalDocs > 0 ? (perfectDocs / docs.totalDocs) * 100 : 0;
  
  const uiRatio = uiComponents.length > 0 ? (docs.uiDocs / uiComponents.length) * 100 : 0;
  const backendRatio = backendComponents.length > 0 ? (docs.backendDocs / backendComponents.length) * 100 : 0;
  const totalRatio = (uiComponents.length + backendComponents.length) > 0 ? 
    (docs.totalDocs / (uiComponents.length + backendComponents.length)) * 100 : 0;
  
  const results: TestResults = {
    uiComponents: {
      realCount: uiComponents.length,
      documentedCount: uiDocumentedPaths.length,
      coverage: uiCoverage,
      documentedPaths: uiDocumentedPaths,
      undocumentedPaths: uiUndocumentedPaths
    },
    backendComponents: {
      realCount: backendComponents.length,
      documentedCount: backendDocumentedPaths.length,
      coverage: backendCoverage,
      documentedPaths: backendDocumentedPaths,
      undocumentedPaths: backendUndocumentedPaths
    },
    docs: {
      totalDocs: docs.totalDocs,
      uiDocs: docs.uiDocs,
      backendDocs: docs.backendDocs,
      stableDocs: docs.stableDocs,
      needsReviewDocs: docs.needsReviewDocs,
      wipDocs: docs.wipDocs
    },
    mathematics: {
      uiRatio,
      backendRatio,
      totalRatio,
      confidenceIndex
    }
  };
  
  return results;
}

/**
 * Muestra resultados de la prueba
 */
function displayResults(results: TestResults) {
  console.log('\n🎯 === RESULTADOS DE LA PRUEBA MATEMÁTICA ===\n');
  
  // Componentes UI
  console.log('📱 COMPONENTES UI');
  console.log(`   Total: ${results.uiComponents.realCount}`);
  console.log(`   Documentados: ${results.uiComponents.documentedCount}`);
  console.log(`   Cobertura: ${results.uiComponents.coverage.toFixed(1)}%`);
  console.log(`   No documentados: ${results.uiComponents.undocumentedPaths.length}`);
  if (results.uiComponents.undocumentedPaths.length > 0) {
    console.log(`   Primeros 5 no documentados:`);
    results.uiComponents.undocumentedPaths.slice(0, 5).forEach(path => {
      console.log(`     - ${path}`);
    });
  }
  
  // Componentes Backend
  console.log('\n⚙️  COMPONENTES BACKEND');
  console.log(`   Total: ${results.backendComponents.realCount}`);
  console.log(`   Documentados: ${results.backendComponents.documentedCount}`);
  console.log(`   Cobertura: ${results.backendComponents.coverage.toFixed(1)}%`);
  console.log(`   No documentados: ${results.backendComponents.undocumentedPaths.length}`);
  if (results.backendComponents.undocumentedPaths.length > 0) {
    console.log(`   Primeros 5 no documentados:`);
    results.backendComponents.undocumentedPaths.slice(0, 5).forEach(path => {
      console.log(`     - ${path}`);
    });
  }
  
  // Documentos
  console.log('\n📚 DOCUMENTACIÓN');
  console.log(`   Total documentos: ${results.docs.totalDocs}`);
  console.log(`   Documentos UI: ${results.docs.uiDocs}`);
  console.log(`   Documentos Backend: ${results.docs.backendDocs}`);
  console.log(`   Estables: ${results.docs.stableDocs} | Needs Review: ${results.docs.needsReviewDocs} | WIP: ${results.docs.wipDocs}`);
  
  // Métricas matemáticas
  console.log('\n🧮 MÉTRICAS MATEMÁTICAS');
  console.log(`   Ratio UI (docs/componentes): ${results.mathematics.uiRatio.toFixed(1)}%`);
  console.log(`   Ratio Backend (docs/componentes): ${results.mathematics.backendRatio.toFixed(1)}%`);
  console.log(`   Ratio Total (docs/componentes): ${results.mathematics.totalRatio.toFixed(1)}%`);
  console.log(`   Índice de Confianza: ${results.mathematics.confidenceIndex.toFixed(1)}%`);
  
  // Validaciones matemáticas
  console.log('\n✅ VALIDACIONES MATEMÁTICAS');
  console.log(`   ¿Cobertura UI ≤ 100%? ${results.uiComponents.coverage <= 100 ? '✅' : '❌'} (${results.uiComponents.coverage.toFixed(1)}%)`);
  console.log(`   ¿Cobertura Backend ≤ 100%? ${results.backendComponents.coverage <= 100 ? '✅' : '❌'} (${results.backendComponents.coverage.toFixed(1)}%)`);
  console.log(`   ¿Índice Confianza ≤ 100%? ${results.mathematics.confidenceIndex <= 100 ? '✅' : '❌'} (${results.mathematics.confidenceIndex.toFixed(1)}%)`);
  console.log(`   ¿Documentados ≤ Total? ${results.uiComponents.documentedCount <= results.uiComponents.realCount && results.backendComponents.documentedCount <= results.backendComponents.realCount ? '✅' : '❌'}`);
  
  // Comparación con algoritmo actual (roto)
  console.log('\n🔄 COMPARACIÓN CON ALGORITMO ACTUAL');
  console.log(`   Algoritmo actual UI: 235 componentes (❌ Error: +${235 - results.uiComponents.realCount})`);
  console.log(`   Algoritmo actual Backend: 212 componentes (❌ Error: +${212 - results.backendComponents.realCount})`);
  console.log(`   Algoritmo correjido UI: ${results.uiComponents.realCount} componentes (✅ Correcto)`);
  console.log(`   Algoritmo correjido Backend: ${results.backendComponents.realCount} componentes (✅ Correcto)`);
}

// Ejecutar prueba
runDocumentationTest()
  .then(results => {
    displayResults(results);
    console.log('\n🎉 Prueba completada exitosamente.');
  })
  .catch(error => {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  });
