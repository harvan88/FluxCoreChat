import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Script determinista para compilar todos los archivos del kernel en un solo MD
 */
async function compileKernelFiles() {
  console.log('🔍 COMPILANDO ARCHIVOS DEL KERNEL EN MD DETERMINISTA');

  const basePath = 'c:\\Users\\harva\\Documents\\Trabajos\\meetgar\\FluxCoreChat\\FluxCoreChat\\apps\\api\\src';
  const outputPath = join(basePath, 'KERNEL_FILES_COMPILATION.md');

  // Lista determinista de archivos a compilar
  const filesToCompile = [
    // Core Kernel
    'core/kernel.ts',
    'core/types.ts',
    'core/events.ts',
    
    // Projectors
    'core/kernel/base.projector.ts',
    'core/projections/chat-projector.ts',
    'core/projections/identity-projector.ts',
    'core/projections/session-projector.ts',
    
    // Services
    'services/fluxcore/chatcore-gateway.service.ts',
    'services/fluxcore/kernel-utils.ts',
    'services/fluxcore/fluxcore.service.ts',
    'services/fluxcore/action-executor.service.ts',
    'services/fluxcore/cognitive-dispatcher.service.ts',
    
    // Workers
    'services/chatcore-outbox.service.ts',
    'workers/cognition-worker.ts',
    
    // Core Message
    'core/message-core.ts',
    
    // Routes
    'routes/messages.routes.ts',
    
    // Debug Scripts
    'scripts/debug-last-item-payload.ts',
    'scripts/audit-complete-flow.ts',
    'scripts/debug-duplicate-outbox.ts',
    'scripts/cleanup-duplicate-outbox.ts',
    'scripts/send-test-message-final.ts',
    'scripts/verify-signal-creation.ts'
  ];

  let mdContent = `# KERNEL FILES COMPILATION

## 📋 COMPILACIÓN DETERMINISTA DE ARCHIVOS DEL KERNEL

*Fecha de compilación: ${new Date().toISOString()}*
*Total de archivos: ${filesToCompile.length}*

---

`;

  // Procesar cada archivo deterministamente
  for (const file of filesToCompile) {
    const filePath = join(basePath, file);
    
    if (existsSync(filePath)) {
      console.log(`📄 Procesando: ${file}`);
      
      try {
        const content = readFileSync(filePath, 'utf8');
        
        mdContent += `## 📁 ${file}

\`\`\`typescript
${content}
\`\`\`

---

      } catch (error) {
        console.log(`❌ Error leyendo ${file}: ${error}`);
        
        mdContent += `## 📁 ${file}

\`\`\`typescript
// ERROR LEYENDO ARCHIVO: ${error}
\`\`\`

---
      }
    } else {
      console.log(`❌ No encontrado: ${file}`);
      
      mdContent += `## 📁 ${file}

\`\`\`typescript
// ARCHIVO NO ENCONTRADO
\`\`\`

---
    }
  }

  // Escribir el archivo compilado
  writeFileSync(outputPath, mdContent, 'utf8');
  
  console.log(`✅ COMPILACIÓN COMPLETA: ${outputPath}`);
  console.log(`📊 Total de archivos procesados: ${filesToCompile.length}`);
}

compileKernelFiles().catch(console.error).finally(() => {
  console.log('🔍 SCRIPT FINALIZADO');
});
