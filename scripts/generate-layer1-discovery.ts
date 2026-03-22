import { join, parse, relative, resolve } from 'path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import * as glob from 'glob';
const globSync = glob.sync;

const ROOT_DIR = resolve(__dirname, '..');
const RECON_MAP_DIR = join(ROOT_DIR, 'docs', 'reconstruction-phase-1', 'exhaustive-mapping');
const UI_DOCS_DIR = join(RECON_MAP_DIR, '01-ui-landscape');
const BACKEND_DOCS_DIR = join(RECON_MAP_DIR, '02-backend-landscape');
const DATE_STR = '2026-03-22';

// Ensure directories exist
[UI_DOCS_DIR, BACKEND_DOCS_DIR].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

function toKebabCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2")
            .replace(/[\s_.]+/g, '-')
            .toLowerCase();
}

function processFile(filePath: string, sourcePath: string, typeGroup: 'ui' | 'api') {
  const content = readFileSync(filePath, 'utf8');
  const relativePath = relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const parsed = parse(filePath);
  const baseName = parsed.name; // e.g., 'DocumentationQualityPanel'
  const sizeLines = content.split('\n').length;
  
  // Categorization
  let docType = 'core';
  if (typeGroup === 'ui') {
    const hasHooks = /use(State|Effect|Query|Mutation|Store|QueryClient|Params|Context|Action|Signal|Store)/.test(content);
    docType = hasHooks ? 'smart-component' : 'ui-component';
  } else {
    docType = filePath.includes('service') ? 'backend-service' : 'core';
  }

  const id = toKebabCase(baseName);
  const docFileName = `${baseName}.md`;
  
  const targetDir = typeGroup === 'ui' ? UI_DOCS_DIR : BACKEND_DOCS_DIR;
  const docFilePath = join(targetDir, docFileName);
  
  // Skip if already exists
  if (existsSync(docFilePath)) {
    // Check if it already exists with other case variants
    return false;
  }
  const possibleDocNames = [
    `${baseName.toUpperCase()}.md`,
    `${baseName.toLowerCase()}.md`,
  ];
  for (const name of possibleDocNames) {
    if (existsSync(join(targetDir, name))) return false;
  }

  // Extract simple imports for layer 1 notes
  const importLines = content.split('\n').filter(line => line.startsWith('import '));
  const mappedDeps = importLines.map(line => {
    // very rudimentary
    const match = line.match(/import\s+(?:{[^}]+}|[^{]+)\s+from\s+['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }).filter(Boolean);
  
  const depString = mappedDeps.length > 0 
    ? mappedDeps.map(d => `- \`${d}\``).join('\n') 
    : '- Ninguna externa evidente';

  let tierContent = '';
  
  if (docType === 'smart-component') {
    tierContent = `
## 🎯 Propósito
Componente react con lógica de estado y efectos. (Descubierto automáticamente).
Ruta exacta: \`${relativePath}\`

## 🧠 Estado y Datos
*Hooks y gestores de estado detectados mecánicamente. Capa 2 requerirá análisis manual.*

## 🔄 Flujos e Interacciones
*Pendiente de mapear en capas superiores.*
`;
  } else if (docType === 'ui-component') {
    tierContent = `
## 🎯 Propósito
Componente react presentacional. (Descubierto automáticamente).
Ruta exacta: \`${relativePath}\`

## 📦 Props
*Interfaz no extraída. Revisar el código fuente para más detalles.*

## 💻 Ejemplo de Uso
\`\`\`tsx
// Uso estimado (requiere validación manual)
import ${baseName} from './${baseName}';

<${baseName} />
\`\`\`
`;
  } else {
    // core or service
    tierContent = `
## 🎯 Propósito
Módulo, servicio o funcionalidad core del backend. (Descubierto automáticamente).
Ruta exacta: \`${relativePath}\`

## 🏗️ Arquitectura
*La arquitectura detallada y su integración dentro del ecosistema se resolverá en la Capa 2 y 3.*

## 🔗 Dependencias Directas Mapeadas
${depString}
`;
  }

  const docData = `---
id: "${id}"
type: "${docType}"
status: "wip"
criticality: "medium"
location: "${relativePath}"

# 🎯 SISTEMA DE CAPAS - EVOLUCIÓN DE DOCUMENTACIÓN
layers:
  discovery:           # Capa 1: Descubrimiento Atómico
    status: "complete"
    completed_date: "${DATE_STR}"
    confidence: 100
    notes: "Componente detectado automáticamente por script de Discovery"
  
  connections:         # Capa 2: Conexiones e Interdependencias
    status: "pending"
    confidence: 0
  
  subsystem:          # Capa 3: Subsistemas Funcionales
    status: "pending"
    confidence: 0
  
  operations:          # Capa 4: Operación y Mantenimiento
    status: "pending"
    confidence: 0

# 📊 Métricas de Evolución
evolution:
  current_layer: 1
  total_layers: 4
  completion_percentage: 25
  last_updated: "${DATE_STR}"
  next_milestone: "connections"
---

# 🤖 ${baseName}

**Ubicación:** \`${relativePath}\`
**Tipo Detectado:** \`${docType}\`
**Tamaño Lógico:** \`${sizeLines} líneas\`

${tierContent}

---

*(Nota: Este documento ha sido generado mecánicamente como parte del levantamiento atómico de la fase 1 de descubrimiento. Requiere revisión para avanzar en el grado de madurez hacia las siguientes capas de arquitectura).*
`;

  writeFileSync(docFilePath, docData, 'utf8');
  return true;
}

async function main() {
  console.log("Iniciando Fase 1: Descubrimiento Atómico Completo...");
  
  let newDocsUi = 0;
  let newDocsApi = 0;

  // glob UI
  console.log("-> Escaneando apps/web/src/**/*.tsx");
  const uiFiles = globSync('apps/web/src/**/*.tsx', { cwd: ROOT_DIR, ignore: ['**/*.test.tsx', '**/*.spec.tsx'] });
  for (const file of uiFiles) {
    const p = join(ROOT_DIR, file);
    if (processFile(p, file, 'ui')) newDocsUi++;
  }

  // glob API
  console.log("-> Escaneando apps/api/src/**/*.ts");
  const apiFiles = globSync('apps/api/src/**/*.ts', { cwd: ROOT_DIR, ignore: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**'] });
  for (const file of apiFiles) {
    const p = join(ROOT_DIR, file);
    if (processFile(p, file, 'api')) newDocsApi++;
  }
  
  console.log('✅ Discovery finalizado exitosamente.');
  console.log('✅ Documentos UI generados:\\t' + newDocsUi);
  console.log('✅ Documentos API generados:\\t' + newDocsApi);
  console.log("Todos los documentos se han ubicado en las carpetas autorizadas de exhaustive-mapping 01/02 y cumplen con el YAML Frontmatter de la estrategia de capas.");
}

main().catch(console.error);
