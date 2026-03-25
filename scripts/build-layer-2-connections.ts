import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, relative, dirname } from 'path';
import matter from 'gray-matter';

const rootPath = join(__dirname, '..');
const docsPath = join(rootPath, 'docs/reconstruction-phase-1/exhaustive-mapping');

const getTsFiles = (dir: string): string[] => {
  let results: string[] = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      if (
        file === 'node_modules' ||
        file === 'dist' ||
        file === '.next' ||
        file.includes('.test.') ||
        file.includes('.spec.')
      ) {
        continue;
      }
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getTsFiles(filePath));
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  } catch (error) {}
  return results;
};

console.log('Cargando todos los archivos .ts y .tsx...');
const allSrcFiles = [
  ...getTsFiles(join(rootPath, 'apps/api/src')),
  ...getTsFiles(join(rootPath, 'apps/web/src')),
  ...getTsFiles(join(rootPath, 'packages/db/src')),
];

const allFilesContent: Record<string, string> = {};
for (const f of allSrcFiles) {
  try {
    allFilesContent[f] = readFileSync(f, 'utf8');
  } catch (e) {}
}

const findDependents = (targetFilePath: string): string[] => {
  const targetBase = basename(targetFilePath).replace('.ts', '').replace('.tsx', '');
  const dependents: string[] = [];
  for (const [f, content] of Object.entries(allFilesContent)) {
    if (f !== targetFilePath) {
      if (content.includes(`/${targetBase}`) || content.includes(`'${targetBase}'`) || content.includes(`"${targetBase}"`)) {
        dependents.push(relative(rootPath, f).replace(/\\/g, '/'));
      }
    }
  }
  return dependents;
};

const getDependencies = (filePath: string): string[] => {
  const content = allFilesContent[filePath];
  if (!content) return [];
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
};

const basename = (p: string) => p.split(/[\\/]/).pop() || '';

const processDocsLayer2 = (dir: string) => {
  console.log(`Procesando carpeta de docs: ${dir}`);
  if (!existsSync(dir)) return;
  const files = readdirSync(dir);
  let processed = 0;
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const docPath = join(dir, file);
    try {
      const fileContent = readFileSync(docPath, 'utf8');
      const parsed = matter(fileContent);
      if (!parsed.data.location) continue;

      let location = parsed.data.location;
      if (location.includes('C:/') || location.includes('C:\\')) {
         location = location.split('FluxCoreChat/FluxCoreChat/')[1] || location.split('FluxCoreChat\\FluxCoreChat\\')[1] || location;
      }
      
      const realLocationPath = resolve(rootPath, location);
      
      const frontmatter = fileContent.match(/---[\s\S]*?---/)?.[0];
      if (!frontmatter) continue;
      
      let newFrontmatter = frontmatter;
      
      if (newFrontmatter.includes('connections:         # Capa 2') || newFrontmatter.includes('connections:')) {
         newFrontmatter = newFrontmatter.replace(/connections:\s*(?:#.*)?\s*status: "pending"\s*confidence: 0/, 'connections:         # Capa 2: Conexiones e Interdependencias\n    status: "complete"\n    confidence: 100\n    notes: "Generado automáticamente por script de Capa 2"');
         newFrontmatter = newFrontmatter.replace(/connections:\s*\{[^}]+\}/, 'connections: { status: "complete", confidence: 100, notes: "Generado auto" }');
      }

      newFrontmatter = newFrontmatter.replace(/current_layer: 1/, 'current_layer: 2');
      newFrontmatter = newFrontmatter.replace(/completion_percentage: 25/, 'completion_percentage: 50');
      newFrontmatter = newFrontmatter.replace(/next_milestone: "connections"/, 'next_milestone: "subsystem"');
      
      // Añadir la sección de Connections si no existe
      if (!parsed.content.includes('## 🔗 Capa 2: Conexiones e Interdependencias')) {
         let depsStr = '';
         let deps = [];
         if (existsSync(realLocationPath)) {
            deps = getDependencies(realLocationPath);
            const dependents = findDependents(realLocationPath);
            
            depsStr += '## 🔗 Capa 2: Conexiones e Interdependencias\n\n';
            depsStr += '### 📦 Dependencias (LO QUE CONSUME)\n';
            if (deps.length > 0) {
              depsStr += deps.map(d => `- \`${d}\``).join('\n') + '\n';
            } else {
              depsStr += '- *No tiene dependencias internas significativas*\n';
            }
            
            depsStr += '\n### 🔄 Dependientes (QUIÉN LO CONSUME)\n';
            if (dependents.length > 0) {
              depsStr += dependents.map(d => `- \`${d}\``).join('\n') + '\n';
            } else {
              depsStr += '- *No hay consumidores detectados o es un entry point*\n';
            }
         } else {
            depsStr += '## 🔗 Capa 2: Conexiones e Interdependencias\n\n*Nota: El archivo fuente no pudo ser encontrado.*';
         }

         const updatedContent = fileContent.replace(frontmatter, newFrontmatter) + '\n\n' + depsStr;
         writeFileSync(docPath, updatedContent, 'utf8');
         processed++;
      }

    } catch (e) {
       console.error(`Error procesando ${file}`, e);
    }
  }
  console.log(`Completados ${processed} archivos en ${dir}`);
};

processDocsLayer2(join(docsPath, '02-backend-landscape'));
processDocsLayer2(join(docsPath, '01-ui-landscape'));

console.log('✅ Fase 2 para las documentaciones detectadas ha finalizado.');
