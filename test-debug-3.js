#!/usr/bin/env node

// Script para probar el fix del path de documentos
const fs = require('fs');
const path = require('path');

console.log('🔍 Probando fix: Solo escanear 01-ui-landscape...');

// Simular el path del backend
const cwd = process.cwd();
const normalizedCwd = cwd.replace(/\\/g, '/');

// Construir el path de docs como lo hace el backend
let docsPath;
if (normalizedCwd.includes('apps/api')) {
  docsPath = path.join(cwd, '../../docs/reconstruction-phase-1/exhaustive-mapping');
} else {
  docsPath = path.join(cwd, 'docs/reconstruction-phase-1/exhaustive-mapping');
}

console.log('📂 Docs path:', docsPath);

// Función corregida para escanear SOLO 01-ui-landscape
const findMarkdownFilesFixed = (dir, fileList = []) => {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // SOLO ESCANEAR 01-ui-landscape
        if (filePath.includes('01-ui-landscape')) {
          findMarkdownFilesFixed(filePath, fileList);
        }
      } else if (file.endsWith('.md') && file !== 'VALIDATION_REPORT.md') {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    console.warn(`No se pudo leer el directorio: ${dir}`, error.message);
  }
  
  return fileList;
};

if (fs.existsSync(docsPath)) {
  const mdFiles = findMarkdownFilesFixed(docsPath);
  console.log('📄 Archivos markdown encontrados (FIX):', mdFiles.length);
  
  console.log('\n📋 Lista de archivos:');
  mdFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${path.relative(docsPath, file)}`);
  });
  
  console.log('\n🧪 Análisis:');
  console.log('  - Archivos encontrados:', mdFiles.length);
  console.log('  - Esperado: ~29 (solo 01-ui-landscape)');
  console.log('  - Diferencia:', mdFiles.length - 29);
  
  if (mdFiles.length === 29) {
    console.log('✅ CORRECTO: Solo escanea 01-ui-landscape');
    
    // Calcular coverage esperado
    const totalComponents = 45;
    const documentedComponents = mdFiles.length;
    const expectedCoverage = (documentedComponents / totalComponents) * 100;
    
    console.log('\n📊 Coverage esperado con el fix:');
    console.log(`  - (${documentedComponents} / ${totalComponents}) * 100 = ${expectedCoverage.toFixed(1)}%`);
    
  } else {
    console.log('❌ ERROR: Aún encuentra demasiados archivos');
  }
  
} else {
  console.log('❌ ERROR: Directorio docs no existe:', docsPath);
}
