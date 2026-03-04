// PRUEBA BÁSICA DE SQL
import { sql } from '@fluxcore/db';

async function testSQLBasic() {
  console.log('🧪 PRUEBA BÁSICA DE SQL');
  
  try {
    // 1. Probar conexión básica
    console.log('\n=== 1. CONEXIÓN BÁSICA ===');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Conexión exitosa');
    console.log('Resultado:', Array.from(result as any[]));
    
    // 2. Probar CREATE TABLE simple
    console.log('\n=== 2. CREAR TABLA DE PRUEBA ===');
    await sql`CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT)`;
    console.log('✅ Tabla de prueba creada');
    
    // 3. Probar INSERT
    console.log('\n=== 3. INSERTAR DATO ===');
    await sql`INSERT INTO test_table (name) VALUES ('test')`;
    console.log('✅ Dato insertado');
    
    // 4. Probar SELECT
    console.log('\n=== 4. CONSULTAR DATOS ===');
    const selectResult = await sql`SELECT * FROM test_table`;
    console.log('✅ Datos consultados:', Array.from(selectResult as any[]));
    
    // 5. Probar DROP
    console.log('\n=== 5. ELIMINAR TABLA DE PRUEBA ===');
    await sql`DROP TABLE test_table`;
    console.log('✅ Tabla de prueba eliminada');
    
    console.log('\n🎯 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
    
  } catch (error) {
    console.error('❌ Error en prueba SQL:', error);
  } finally {
    process.exit(0);
  }
}

testSQLBasic().catch(console.error);
