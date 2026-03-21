#!/usr/bin/env node

// Script de prueba para diagnosticar el problema de coverage
const http = require('http');

console.log('🔍 Iniciando diagnóstico de coverage...');

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
      console.log('📊 Respuesta del backend:');
      console.log('  - totalDocs:', parsed.totalDocs);
      console.log('  - documentedComponents:', parsed.documentedComponents);
      console.log('  - totalComponents:', parsed.totalComponents);
      console.log('  - coveragePercentage:', parsed.coveragePercentage);
      console.log('  - qualityScore:', parsed.qualityScore);
      console.log('  - overallScore:', parsed.overallScore);
      
      // Cálculo esperado
      const expectedCoverage = parsed.totalComponents > 0 
        ? (parsed.documentedComponents / parsed.totalComponents) * 100 
        : 0;
      
      console.log('\n🧪 Cálculo esperado:');
      console.log(`  - (${parsed.documentedComponents} / ${parsed.totalComponents}) * 100 = ${expectedCoverage.toFixed(1)}%`);
      
      console.log('\n🚨 Diagnóstico:');
      if (parsed.coveragePercentage === 100 && expectedCoverage !== 100) {
        console.log('  ❌ ERROR: Backend retorna 100% pero debería ser', expectedCoverage.toFixed(1) + '%');
        console.log('  🔍 Posibles causas:');
        console.log('    - countReactComponents() está retornando valor incorrecto');
        console.log('    - Hay un error en el cálculo del backend');
        console.log('    - El frontend está cacheando datos viejos');
      } else if (parsed.coveragePercentage === expectedCoverage) {
        console.log('  ✅ CORRECTO: Backend calcula correctamente');
      } else {
        console.log('  ⚠️ INCONSISTENCIA: Backend calcula', parsed.coveragePercentage + '% pero debería ser', expectedCoverage.toFixed(1) + '%');
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
