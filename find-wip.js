#!/usr/bin/env node

// Script para encontrar el documento WIP
const http = require('http');

console.log('🔍 Buscando documento WIP...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/fluxcore/documentation/quality',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      
      // Buscar documentos con status 'wip'
      const wipFiles = [];
      
      const scanDirectory = (dir, fileList = []) => {
        try {
          const files = require('fs').readdirSync(dir);
          
          for (const file of files) {
            const filePath = require('path').join(dir, file);
            const stat = require('fs').statSync(filePath);
            
            if (stat.isDirectory()) {
              scanDirectory(filePath, fileList);
            } else if (file.endsWith('.md')) {
              try {
                const content = require('fs').readFileSync(filePath, 'utf-8');
                
                // Buscar frontmatter con status wip
                const frontmatterMatch = content.match(/---[\s\S]*?---([\s\S]*?)---/);
                if (frontmatterMatch) {
                  const frontmatter = frontmatterMatch[1];
                  const statusMatch = frontmatter.match(/status:\s*["'](.+?)["']/);
                  
                  if (statusMatch && statusMatch[1].toLowerCase() === 'wip') {
                    wipFiles.push(file);
                    }
                }
              } catch (error) {
                // Skip files that can't be read
              }
            }
          }
        } catch (error) {
          // Skip directories that can't be read
        }
        
        return fileList;
      };
      
      // Escanear el directorio de documentos
      const docsDir = 'docs/reconstruction-phase-1/exhaustive-mapping/01-ui-landscape';
      if (require('fs').existsSync(docsDir)) {
        scanDirectory(docsDir);
      }
      
      console.log('📋 Documentos con status "wip":');
      if (wipFiles.length > 0) {
        wipFiles.forEach(file => {
          console.log(`  📝 ${file}`);
        });
      } else {
        console.log('  ✅ No se encontraron documentos WIP');
      }
      
      console.log('\n📊 Métricas actuales:');
      console.log(`  - Score: ${parsed.score.toFixed(1)}%`);
      console.log(`  - Estables: ${parsed.stableDocs}/29`);
      console.log(`  - WIP: ${parsed.wipDocs}/29`);
      console.log(`  - Errores: ${parsed.formatErrorsCount}/29`);
      console.log(`  - Coverage: ${parsed.coveragePercentage.toFixed(1)}%`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error en la petición:', error.message);
});

req.end();

console.log('⏳ Esperando respuesta del backend...');
