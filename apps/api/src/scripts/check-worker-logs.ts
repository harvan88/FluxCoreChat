import { db, sql } from '@fluxcore/db';

/**
 * Verificar si el worker está procesando mensajes nuevos
 */
async function checkWorkerLogs() {
  console.log('🔍 VERIFICANDO WORKER LOGS');

  try {
    // 1. Verificar outbox entries recientes
    const recentOutbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, sent_at
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('\n📊 OUTBOX RECIENTES:');
    console.table(recentOutbox);

    // 2. Verificar mensajes recientes sin signal_id
    const messagesWithoutSignal = await db.execute(sql`
      SELECT id, created_at, content
      FROM messages
      WHERE signal_id IS NULL
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('\n📊 MENSAJES SIN SIGNAL_ID:');
    console.table(messagesWithoutSignal);

    // 3. Verificar si hay señales nuevas (después de las últimas)
    const latestSignal = await db.execute(sql`
      SELECT sequence_number, observed_at
      FROM fluxcore_signals
      ORDER BY sequence_number DESC
      LIMIT 1
    `);

    console.log('\n📊 SEÑAL MÁS RECIENTE:');
    console.table(latestSignal);

    // 4. Comparar timestamps
    if (recentOutbox.length > 0 && latestSignal.length > 0) {
      const lastOutbox = recentOutbox[0];
      const lastSignal = latestSignal[0];
      
      console.log('\n🔍 COMPARACIÓN DE TIMESTAMPS:');
      console.log(`- Último outbox: ${lastOutbox.created_at}`);
      console.log(`- Última señal: ${lastSignal.observed_at}`);
      
      const outboxTime = new Date(lastOutbox.created_at);
      const signalTime = new Date(lastSignal.observed_at);
      
      if (outboxTime > signalTime) {
        console.log('⚠️ HAY OUTBOX MÁS RECIENTE QUE LA ÚLTIMA SEÑAL');
        console.log('❌ El worker no está procesando mensajes nuevos');
      } else {
        console.log('✅ Las señales están actualizadas');
      }
    }

    // 5. Verificar si el worker está corriendo
    console.log('\n🔍 VERIFICANDO SI EL WORKER DEBERÍA ESTAR ACTIVO:');
    console.log('Revisa los logs del servidor API. Deberías ver:');
    console.log('- [ChatCoreOutbox] 🔄 Starting certification worker...');
    console.log('- [ChatCoreOutbox] ✅ Certified message xxx');
    console.log('- [ChatCoreGateway] ✅ Certified message');

    console.log('\n📋 ACCIONES RECOMENDADAS:');
    console.log('1. Revisa los logs del servidor API');
    console.log('2. Busca errores en ChatCoreGateway');
    console.log('3. Verifica que el worker esté corriendo');
    console.log('4. Reinicia el servidor API si es necesario');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkWorkerLogs().catch(console.error);
