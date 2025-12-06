#!/usr/bin/env bun
/**
 * FluxCore - Script de Pruebas Unificado
 * 
 * Ejecuta todas las pruebas del proyecto de forma optimizada
 * 
 * Uso:
 *   bun run scripts/run-tests.ts          # Ejecutar todas las pruebas
 *   bun run scripts/run-tests.ts chat     # Solo pruebas de chat
 *   bun run scripts/run-tests.ts ext      # Solo pruebas de extensiones
 *   bun run scripts/run-tests.ts ai       # Solo pruebas de IA
 */

const API_URL = 'http://localhost:3000';

interface TestSuite {
  name: string;
  file: string;
  category: string;
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
}

const suites: TestSuite[] = [
  { name: 'Chat System', file: 'apps/api/src/test-chat.ts', category: 'chat' },
  { name: 'Extension System', file: 'apps/api/src/test-extensions.ts', category: 'ext' },
  { name: 'AI Core', file: 'apps/api/src/test-ai.ts', category: 'ai' },
  { name: 'Context System', file: 'apps/api/src/test-context.ts', category: 'ctx' },
];

async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function runSuite(suite: TestSuite): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const proc = Bun.spawn(['bun', 'run', suite.file], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    // Parse output for results
    const passedMatch = output.match(/✅ Passed: (\d+)/);
    const failedMatch = output.match(/❌ Failed: (\d+)/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    
    return {
      suite: suite.name,
      passed,
      failed,
      total: passed + failed,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      suite: suite.name,
      passed: 0,
      failed: 1,
      total: 1,
      duration: Date.now() - start,
    };
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           FluxCore - Test Runner                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  // Check server
  console.log('🔍 Verificando servidor...');
  const serverUp = await checkServer();
  
  if (!serverUp) {
    console.log('❌ El servidor no está corriendo en', API_URL);
    console.log('   Ejecuta: cd apps/api && bun run src/index.ts');
    process.exit(1);
  }
  console.log('✅ Servidor activo\n');
  
  // Filter suites based on argument
  const filter = process.argv[2];
  let suitesToRun = suites;
  
  if (filter) {
    suitesToRun = suites.filter(s => s.category === filter);
    if (suitesToRun.length === 0) {
      console.log(`❌ Categoría desconocida: ${filter}`);
      console.log('   Categorías válidas: chat, ext, ai');
      process.exit(1);
    }
  }
  
  // Check if test files exist
  const existingSuites = [];
  for (const suite of suitesToRun) {
    const file = Bun.file(suite.file);
    if (await file.exists()) {
      existingSuites.push(suite);
    } else {
      console.log(`⚠️  Archivo no existe: ${suite.file}`);
    }
  }
  
  if (existingSuites.length === 0) {
    console.log('❌ No hay suites de prueba disponibles');
    process.exit(1);
  }
  
  // Run suites
  console.log(`📋 Ejecutando ${existingSuites.length} suite(s) de pruebas...\n`);
  
  const results: TestResult[] = [];
  
  for (const suite of existingSuites) {
    console.log(`\n▶️  ${suite.name}...`);
    const result = await runSuite(suite);
    results.push(result);
    
    const status = result.failed === 0 ? '✅' : '❌';
    console.log(`   ${status} ${result.passed}/${result.total} (${result.duration}ms)`);
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('═'.repeat(60));
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  let totalDuration = 0;
  
  for (const r of results) {
    const status = r.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${r.suite.padEnd(25)} ${r.passed}/${r.total} (${r.duration}ms)`);
    totalPassed += r.passed;
    totalFailed += r.failed;
    totalTests += r.total;
    totalDuration += r.duration;
  }
  
  console.log('─'.repeat(60));
  console.log(`   ${'Total'.padEnd(25)} ${totalPassed}/${totalTests} (${totalDuration}ms)`);
  console.log('═'.repeat(60));
  
  if (totalFailed === 0) {
    console.log('\n🎉 ¡Todas las pruebas pasaron!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${totalFailed} prueba(s) fallaron.\n`);
    process.exit(1);
  }
}

main();
