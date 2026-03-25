import { readdirSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, basename, extname } from 'path';

// Configuración de rutas relativas al directorio raíz del repositorio
const REPO_ROOT = join(__dirname, '..');
const UI_SRC = join(REPO_ROOT, 'apps/web/src');
const API_SRC = join(REPO_ROOT, 'apps/api/src');
const UI_LANDSCAPE = join(REPO_ROOT, 'docs/reconstruction-phase-1/exhaustive-mapping/01-ui-landscape');
const BACKEND_LANDSCAPE = join(REPO_ROOT, 'docs/reconstruction-phase-1/exhaustive-mapping/02-backend-landscape');

const EXCLUDE_PATTERNS = [
  'node_modules', '.test.ts', '.spec.ts', '.test.tsx', '.spec.tsx', 
  'audit-', 'debug-', 'check-', 'fix-', 'verify-', 'history', '_legacy', 'tmp', '.gemini'
];

/**
 * Escanea directorios recursivamente buscando archivos con la extensión dada
 */
function getFiles(dir: string, ext: string): string[] {
  let results: string[] = [];
  if (!existsSync(dir)) return [];

  const list = readdirSync(dir);
  list.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!EXCLUDE_PATTERNS.includes(file)) {
        results = results.concat(getFiles(filePath, ext));
      }
    } else if (file.endsWith(ext)) {
      if (!EXCLUDE_PATTERNS.some(p => file.includes(p))) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const today = new Date().toISOString().split('T')[0];

// 1. Descubrimiento UI (PascalCase.md)
console.log('🔍 Escaneando UI para componentes sin documentar...');
const uiFiles = getFiles(UI_SRC, '.tsx');
let uiCreated = 0;

uiFiles.forEach(file => {
  const name = basename(file, '.tsx');
  // En UI usamos PascalCase.md directamente
  const docPath = join(UI_LANDSCAPE, `${name}.md`);
  
  if (!existsSync(docPath)) {
    const relativePath = file.replace(REPO_ROOT + '/', '').replace(/\\/g, '/');
    const content = `---
id: "${name.toLowerCase().replace(/_/g, '-')}"
type: "ui-component"
status: "wip"
criticality: "medium"
location: "${relativePath}"

# 🎯 SISTEMA DE CAPAS - EVOLUCIÓN DE DOCUMENTACIÓN
layers:
  discovery:           # Capa 1: Descubrimiento Atómico
    status: "complete"
    completed_date: "${today}"
    confidence: 100
    notes: "Componente detectado automáticamente por FluxCore Discoverer"
  
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
  last_updated: "${today}"
  next_milestone: "connections"
---

# 🤖 ${name}

**Ubicación:** \`${relativePath}\`
**Tipo:** Componente de UI descubierto automáticamente.

## 🎯 Propósito
Este componente ha sido catalogado mecánicamente como parte de la Fase 1. Requiere revisión de Capa 2 para mapear sus dependencias reales.

---

*(Nota: Documento generado automáticamente por el sistema de descubrimiento atómico).*
`;
    writeFileSync(docPath, content);
    uiCreated++;
  }
});

// 2. Descubrimiento Backend (kebab-case.md)
console.log('🔍 Escaneando Backend para módulos sin documentar...');
const apiFiles = getFiles(API_SRC, '.ts').filter(f => 
  f.includes('services') || f.includes('routes') || f.includes('core') || f.includes('middleware') || f.includes('workers')
);
let apiCreated = 0;

apiFiles.forEach(file => {
  // En Backend usamos kebab-case.md
  const docName = basename(file, '.ts').toLowerCase().replace(/_/g, '-');
  const docPath = join(BACKEND_LANDSCAPE, `${docName}.md`);
  
  if (!existsSync(docPath)) {
    const relativePath = file.replace(REPO_ROOT + '/', '').replace(/\\/g, '/');
    const content = `---
id: "${docName}"
type: "backend-service"
status: "wip"
criticality: "medium"
location: "${relativePath}"

# 🎯 SISTEMA DE CAPAS - EVOLUCIÓN DE DOCUMENTACIÓN
layers:
  discovery:           # Capa 1: Descubrimiento Atómico
    status: "complete"
    completed_date: "${today}"
    confidence: 100
    notes: "Módulo detectado automáticamente por FluxCore Discoverer"
  
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
  last_updated: "${today}"
  next_milestone: "connections"
---

# 🤖 ${docName}

**Ubicación:** \`${relativePath}\`
**Tipo:** Módulo de Backend descubierto automáticamente.

## 🎯 Propósito
Este servicio/ruta ha sido catalogado mecánicamente como parte de la Fase 1. Requiere revisión de Capa 2 para mapear su integración sistémica.

---

*(Nota: Documento generado automáticamente por el sistema de descubrimiento atómico).*
`;
    writeFileSync(docPath, content);
    apiCreated++;
  }
});

console.log(`\n✅ ¡Fase 1 de Descubrimiento Completada!`);
console.log(`📊 Resultado:`);
console.log(`   - UI: ${uiCreated} nuevos esqueletos .md creados.`);
console.log(`   - Backend: ${apiCreated} nuevos esqueletos .md creados.`);
console.log(`\nTotal: ${uiCreated + apiCreated} documentos generados.`);
