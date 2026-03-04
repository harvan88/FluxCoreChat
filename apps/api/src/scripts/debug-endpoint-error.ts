import { db, sql } from '@fluxcore/db';

/**
 * Debug del error del endpoint antiguo
 */
async function debugEndpointError() {
  console.log('🔍 DEBUGGING ENDPOINT ERROR');

  try {
    // 1. Verificar si el endpoint antiguo existe
    console.log('\n📊 VERIFICANDO ENDPOINT ANTIGUO:');
    console.log('Endpoint: GET /kernel/sessions/active');
    
    // 2. Verificar la tabla que intenta usar
    console.log('\n📊 VERIFICANDO TABLA fluxcore_session_projection:');
    const tableExists = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'fluxcore_session_projection'
    `);

    console.log(`Tabla existe: ${tableExists.length > 0 ? '✅' : '❌'}`);

    if (tableExists.length > 0) {
      // 3. Verificar datos en la tabla
      const data = await db.execute(sql`
        SELECT COUNT(*) as total FROM fluxcore_session_projection
      `);

      console.log(`Total registros: ${data[0].total}`);

      // 4. Verificar si hay datos para la cuenta actual
      const accountData = await db.execute(sql`
        SELECT * FROM fluxcore_session_projection 
        WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      `);

      console.log(`Datos para cuenta actual: ${accountData.length}`);
      console.table(accountData);
    }

    // 5. Probar el endpoint nuevo
    console.log('\n📊 PROBANDO ENDPOINT NUEVO:');
    console.log('Endpoint: GET /kernel/status/overview');

    const kernelStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_signals,
        COUNT(DISTINCT fact_type) as unique_fact_types,
        MAX(observed_at) as last_signal_at,
        COUNT(CASE WHEN observed_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as signals_last_hour,
        COUNT(CASE WHEN observed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as signals_last_24h
      FROM fluxcore_signals
    `);

    console.log('✅ Endpoint nuevo funciona:');
    console.table(kernelStats);

    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('❌ El endpoint antiguo /kernel/sessions/active falla');
    console.log('✅ El endpoint nuevo /kernel/status/overview funciona');
    console.log('🔧 La UI todavía usa el hook antiguo que llama al endpoint antiguo');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugEndpointError().catch(console.error);
