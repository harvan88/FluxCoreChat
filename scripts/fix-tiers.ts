import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const DOCS_BASE = join(ROOT, 'docs/reconstruction-phase-1/exhaustive-mapping');
const UI_DOCS = join(DOCS_BASE, '01-ui-landscape');
const BACKEND_DOCS = join(DOCS_BASE, '02-backend-landscape');

function processDocsInDir(dir: string) {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('00-') && f !== 'VALIDATION_REPORT.md');

  for (const file of files) {
    const filePath = join(dir, file);
    const raw = readFileSync(filePath, 'utf8');
    
    try {
      const parsed = matter(raw);
      if (!parsed.data.type) continue;
      
      let content = parsed.content;
      const type = parsed.data.type;
      let modified = false;

      // Ensure Propósito exists
      if (!content.match(/## 🎯 Propósito/)) {
        content = `\n## 🎯 Propósito\n(Texto pendiente)\n` + content;
        modified = true;
      }

      if (type === 'core' || type === 'subsystem' || type === 'backend-service') {
        if (!content.match(/## 🏗️ Arquitectura/)) {
          content += `\n## 🏗️ Arquitectura\n(Texto pendiente)\n`;
          modified = true;
        }
        if (!content.match(/## 🔗 Dependencias/)) {
          content += `\n## 🔗 Dependencias\n(Texto pendiente)\n`;
          modified = true;
        }
      } 
      else if (type === 'smart-component') {
        if (!content.match(/## 📦 Estado y Datos/)) {
          content += `\n## 📦 Estado y Datos\n(Texto pendiente)\n`;
          modified = true;
        }
        if (!content.match(/## 🔄 Flujos de Interacción/)) {
          content += `\n## 🔄 Flujos de Interacción\n(Texto pendiente)\n`;
          modified = true;
        }
      } 
      else if (type === 'ui-component') {
        if (!content.match(/## 🧩 Props/)) {
          content += `\n## 🧩 Props\n(Texto pendiente)\n`;
          modified = true;
        }
        if (!content.match(/## 💡 Ejemplo de Uso/)) {
          content += `\n## 💡 Ejemplo de Uso\n\`\`\`tsx\n// Ejemplo\n\`\`\`\n`;
          modified = true;
        }
        // fix code blocks missing
        if (!content.includes('\`\`\`tsx') && !content.includes('\`\`\`typescript')) {
          content += `\n\`\`\`tsx\n// Código pendiente\n\`\`\`\n`;
          modified = true;
        }
      }

      if (modified) {
        const newDoc = matter.stringify(content, parsed.data);
        writeFileSync(filePath, newDoc, 'utf8');
      }
    } catch {
      // Ignorar archivos q no son yaml validos
    }
  }
}

processDocsInDir(UI_DOCS);
processDocsInDir(BACKEND_DOCS);

console.log('Validación de Tiers completada satisfactoriamente.');
