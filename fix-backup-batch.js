#!/usr/bin/env node

// Script para corregir todos los archivos BACKUP de una vez
const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigiendo archivos BACKUP...');

const backupFiles = [
  'TEMPLATES_SUBSYSTEM_BACKUP.md',
  'TEMPLATE_ASSET_PICKER_BACKUP.md', 
  'TEMPLATE_EDITOR_BACKUP.md',
  'TEMPLATE_MANAGER_BACKUP.md',
  'TEMPLATE_MANAGER_BACKUP_README.md',
  'TEMPLATE_QUICK_PICKER_BACKUP.md'
];

const baseDir = 'docs/reconstruction-phase-1/exhaustive-mapping/01-ui-landscape';

backupFiles.forEach(file => {
  const filePath = path.join(baseDir, file);
  
  try {
    if (fs.existsSync(filePath)) {
      // Leer el contenido actual
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extraer el nombre base del archivo
      const baseName = file.replace('_BACKUP.md', '').replace('.md', '');
      
      // Crear frontmatter
      const frontmatter = `---
id: "${baseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-backup"
type: "smart-component"
status: "deprecated"
criticality: "low"
location: "apps/web/src/components/templates"
---

`;
      
      // Buscar el primer título
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : `${baseName} (BACKUP)`;
      
      // Reemplazar el título
      const updatedContent = content.replace(/^# .+$/m, `# ${title}`);
      
      // Escribir el archivo corregido
      const fullContent = frontmatter + updatedContent;
      fs.writeFileSync(filePath, fullContent, 'utf-8');
      
      console.log(`✅ Corregido: ${file}`);
    } else {
      console.log(`⚠️  No encontrado: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error corrigiendo ${file}:`, error.message);
  }
});

console.log('🎉 ¡Corrección de archivos BACKUP completada!');
