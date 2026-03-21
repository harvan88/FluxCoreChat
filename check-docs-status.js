#!/usr/bin/env node

// Script para analizar el estado de los documentos y mostrar cuáles necesitan revisión
const http = require('http');

console.log('🔍 Analizando estado de documentación...');

// Hacer llamada directa al endpoint
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
      console.log('📊 Estado de Documentación:');
      console.log('  - Total documentos:', parsed.totalDocs);
      console.log('  - WIP (En Progreso):', parsed.wipDocs);
      console.log('  - Needs Review (Necesita Revisión):', parsed.needsReviewDocs);
      console.log('  - Stable (Estables):', parsed.stableDocs);
      console.log('  - Errores de formato:', parsed.formatErrorsCount);
      console.log('  - Issues críticas:', parsed.criticalIssues);
      console.log('  - Advertencias:', parsed.warnings);
      
      console.log('\n🎯 Análisis de Acciones Requeridas:');
      
      // Documentos que necesitan atención
      const totalNeedsAttention = parsed.wipDocs + parsed.needsReviewDocs + parsed.formatErrorsCount;
      
      if (totalNeedsAttention > 0) {
        console.log(`📋 ${totalNeedsAttention} documentos necesitan atención:`);
        
        if (parsed.wipDocs > 0) {
          console.log(`  🔨 ${parsed.wipDocs} documentos en WIP - Revisar si pueden marcarse como 'stable'`);
        }
        
        if (parsed.needsReviewDocs > 0) {
          console.log(`  👁️ ${parsed.needsReviewDocs} documentos necesitan revisión - Prioridad alta`);
        }
        
        if (parsed.formatErrorsCount > 0) {
          console.log(`  📝 ${parsed.formatErrorsCount} documentos con errores de formato - Requeridos para score`);
        }
        
        console.log('\n🚀 Plan de Acción Sugerido:');
        
        // Priorizar por impacto
        if (parsed.formatErrorsCount > 0) {
          console.log('  1️⃣ PRIORIDAD ALTA: Corregir errores de formato (impacta score directamente)');
          console.log('     - Agregar frontmatter YAML');
          console.log('     - Completar secciones requeridas');
        }
        
        if (parsed.needsReviewDocs > 0) {
          console.log('  2️⃣ PRIORIDAD MEDIA: Revisar documentos marcados como "needs_review"');
          console.log('     - Validar contenido actualizado');
          console.log('     - Cambiar a "stable" si está completo');
        }
        
        if (parsed.wipDocs > 0) {
          console.log('  3️⃣ PRIORIDAD BAJA: Completar documentos WIP');
          console.log('     - Terminar contenido pendiente');
          console.log('     - Mover a "stable" o "needs_review"');
        }
        
        console.log('\n📈 Impacto Esperado en Métricas:');
        console.log(`  - Score actual: ${parsed.qualityScore.toFixed(1)}%`);
        console.log(`  - Si se corrigen todos los formatos: ${(parsed.qualityScore + (parsed.formatErrorsCount * 5)).toFixed(1)}% (estimado)`);
        console.log(`  - Coverage actual: ${parsed.coveragePercentage.toFixed(1)}%`);
        console.log(`  - Documents estables: ${parsed.stableDocs}/${parsed.totalDocs} (${((parsed.stableDocs / parsed.totalDocs) * 100).toFixed(1)}%)`);
        
      } else {
        console.log('✅ ¡Excelente! Todos los documentos están en buen estado');
      }
      
      // Mostrar errores específicos si hay
      if (parsed.formatErrors && parsed.formatErrors.length > 0) {
        console.log('\n🚨 Errores Específicos Encontrados:');
        parsed.formatErrors.slice(0, 5).forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.component}: ${error.error}`);
        });
        
        if (parsed.formatErrors.length > 5) {
          console.log(`  ... y ${parsed.formatErrors.length - 5} errores más`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error parseando JSON:', error.message);
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error en la petición:', error.message);
});

req.end();

console.log('⏳ Esperando respuesta del backend...');
