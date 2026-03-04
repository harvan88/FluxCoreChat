import { db, sql } from '@fluxcore/db';

/**
 * Verificar si se creó la señal #239
 */
async function verifySignalCreation() {
  console.log('🔍 VERIFICANDO CREACIÓN DE SEÑAL #239');

  try {
    // 1. Verificar contador de señales
    const signalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_signals
    `);
    
    console.log(`📊 Total de señales: ${signalCount[0].total}`);

    // 2. Buscar la última señal
    const latestSignal = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at, certified_by_adapter, evidence_raw
      FROM fluxcore_signals
      ORDER BY sequence_number DESC
      LIMIT 1
    `);

    console.log('\n📊 ÚLTIMA SEÑAL:');
    console.table(latestSignal);

    // 3. Verificar si hay señal #239
    const signal239 = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at, certified_by_adapter, evidence_raw
      FROM fluxcore_signals
      WHERE sequence_number = 239
    `);

    if (signal239.length > 0) {
      console.log('\n🎉 ¡SEÑAL #239 ENCONTRADA!');
      console.table(signal239);
      
      // Verificar evidence
      try {
        const evidence = JSON.parse(signal239[0].evidence_raw);
        console.log('\n🔍 EVIDENCE DE SEÑAL #239:');
        console.log('- messageId:', evidence.meta?.messageId);
        console.log('- conversationId:', evidence.context?.conversationId);
        console.log('- accountId:', evidence.accountId);
      } catch (error) {
        console.log('❌ Error parsing evidence:', error);
      }
    } else {
      console.log('\n❌ SEÑAL #239 NO ENCONTRADA');
    }

    // 4. Verificar últimas 5 señales
    const recentSignals = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at
      FROM fluxcore_signals
      ORDER BY sequence_number DESC
      LIMIT 5
    `);

    console.log('\n📊 ÚLTIMAS 5 SEÑALES:');
    console.table(recentSignals);

    // 5. Verificar el mensaje más reciente
    const recentMessage = await db.execute(sql`
      SELECT id, created_at, signal_id, content
      FROM messages
      ORDER BY created_at DESC
      LIMIT 1
    `);

    console.log('\n📊 MENSAJE MÁS RECIENTE:');
    console.table(recentMessage);

    // 6. Verificar si el worker está funcionando
    console.log('\n🔍 VERIFICANDO WORKER:');
    console.log('Si el worker está funcionando, deberíamos ver logs como:');
    console.log('- [ChatCoreOutbox] ✅ Certified message xxx');
    console.log('- [ChatCoreGateway] ✅ Certified message');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

verifySignalCreation().catch(console.error);
