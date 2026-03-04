import { db, sql } from '@fluxcore/db';

/**
 * Probar si un mensaje nuevo genera una señal
 */
async function testNewMessageFlow() {
  console.log('🧪 PROBANDO FLUJO DE MENSAJE NUEVO');

  try {
    // 1. Verificar estado actual
    console.log('\n📊 ESTADO ACTUAL:');
    const currentSignals = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_signals
    `);
    console.log(`Señales actuales: ${currentSignals[0].total}`);

    const currentMessages = await db.execute(sql`
      SELECT COUNT(*) as total FROM messages
    `);
    console.log(`Mensajes actuales: ${currentMessages[0].total}`);

    const currentOutbox = await db.execute(sql`
      SELECT COUNT(*) as total FROM chatcore_outbox
    `);
    console.log(`Outbox entries: ${currentOutbox[0].total}`);

    // 2. Contar señales por tipo
    const signalsByType = await db.execute(sql`
      SELECT fact_type, COUNT(*) as count
      FROM fluxcore_signals
      GROUP BY fact_type
      ORDER BY count DESC
    `);

    console.log('\n📊 SEÑALES POR TIPO:');
    console.table(signalsByType);

    // 3. Verificar últimas 10 señales
    const recentSignals = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at, certified_by_adapter
      FROM fluxcore_signals
      ORDER BY sequence_number DESC
      LIMIT 10
    `);

    console.log('\n📊 ÚLTIMAS 10 SEÑALES:');
    console.table(recentSignals);

    // 4. Verificar si hay mensajes recientes sin signal_id
    const recentMessages = await db.execute(sql`
      SELECT id, created_at, signal_id
      FROM messages
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 MENSAJES RECIENTES:');
    console.table(recentMessages);

    const messagesWithoutSignal = Array.isArray(recentMessages) ? recentMessages.filter(m => !m.signal_id) : [];
    if (messagesWithoutSignal.length > 0) {
      console.log(`\n⚠️ ${messagesWithoutSignal.length} mensajes recientes sin signal_id`);
    } else {
      console.log('\n✅ Todos los mensajes recientes tienen signal_id');
    }

    // 5. Verificar outbox pendiente
    const pendingOutbox = await db.execute(sql`
      SELECT COUNT(*) as count FROM chatcore_outbox WHERE status = 'pending'
    `);

    console.log(`\n📊 Outbox pendiente: ${pendingOutbox[0]?.count || 0}`);

    // 6. Análisis
    console.log('\n🎯 ANÁLISIS:');
    if (Number(currentSignals[0]?.total) > 235) {
      console.log('✅ Las señales son antiguas (probablemente de pruebas)');
      console.log('❌ Los mensajes nuevos no están generando señales');
      console.log('🔍 El problema está en el flujo de certificación');
    } else {
      console.log('✅ Las señales son recientes');
      console.log('✅ El flujo está funcionando');
    }

    console.log('\n📋 RECOMENDACIÓN:');
    console.log('1. Enviar un mensaje nuevo desde la UI');
    console.log('2. Verificar si aparece en outbox');
    console.log('3. Verificar si se genera una señal nueva');
    console.log('4. Revisar logs del ChatCoreGateway');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testNewMessageFlow().catch(console.error);
