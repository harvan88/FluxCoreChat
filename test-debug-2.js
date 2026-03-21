#!/usr/bin/env node

// Script para debug qué archivos está encontrando el backend
const fs = require('fs');
const path = require('path');

console.log('🔍 Debug: Qué archivos está escaneando el backend...');

// Simular el path del backend
const cwd = process.cwd();
console.log('📁 Working directory:', cwd);

// Normalizar path como hace el backend
const normalizedCwd = cwd.replace(/\\/g, '/');
console.log('📁 Normalized CWD:', normalizedCwd);

// Construir el path de docs como lo hace el backend
let docsPath;
if (normalizedCwd.includes('apps/api')) {
  docsPath = path.join(cwd, '../../docs/reconstruction-phase-1/exhaustive-mapping');
} else {
  docsPath = path.join(cwd, 'docs/reconstruction-phase-1/exhaustive-mapping');
}

console.log('📂 Docs path:', docsPath);

// Verificar si el directorio existe
if (fs.existsSync(docsPath)) {
  console.log('✅ Directorio docs existe');
  
  // Listar archivos que coinciden con el patrón del backend
  const findMarkdownFiles = (dir, fileList = []) => {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          findMarkdownFiles(filePath, fileList);
        } else if (file.endsWith('.md') && file !== 'VALIDATION_REPORT.md') {
          fileList.push(filePath);
        }
      }
    } catch (error) {
      console.warn(`No se pudo leer el directorio: ${dir}`, error.message);
    }
    
    return fileList;
  };
  
  const mdFiles = findMarkdownFiles(docsPath);
  console.log('📄 Archivos markdown encontrados:', mdFiles.length);
  console.log('📋 Lista de archivos:');
  mdFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${path.relative(docsPath, file)}`);
  });
  
  console.log('\n🧪 Análisis:');
  console.log('  - Archivos encontrados:', mdFiles.length);
  console.log('  - Debería ser 39 (según el script de debug anterior)');
  console.log('  - Diferencia:', mdFiles.length - 39);
  
  if (mdFiles.length !== 39) {
    console.log('🚨 ERROR: El backend está encontrando más archivos de los esperados');
    console.log('🔍 Posibles causas:');
    console.log('    - El path de docs es incorrecto');
    console.log('    - Hay archivos .md adicionales no considerados');
    console.log('    - El filtro VALIDATION_REPORT.md no funciona');
  } else {
    console.log('✅ CORRECTO: El backend encuentra los archivos correctos');
  }
  
} else {
  console.log('❌ ERROR: Directorio docs no existe:', docsPath);
}
