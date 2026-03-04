import { db, sql } from '@fluxcore/db';

/**
 * Verificar señales de ChatCore recientes
 */
async function checkChatCoreSignals() {
  console.log('🔍 VERIFICANDO SEÑALES DE CHATCORE');

  try {
    // 1. Verificar señales de chatcore.message.received
    const chatSignals = await db.execute(sql`
      SELECT 
        id,
        fact_type,
        sequence_number,
        payload,
        created_at
      FROM fluxcore_signals 
      WHERE fact_type = 'chatcore.message.received'
        AND created_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY sequence_number DESC
      LIMIT 10
    `);

    console.log('\n📊 SEÑALES DE CHATCORE.MESSAGE.RECEIVED:');
    if (chatSignals.length === 0) {
      console.log('❌ No hay señales de chatcore.message.received recientes');
    } else {
      console.table(chatSignals);
      chatSignals.forEach((signal, index) => {
        console.log(`\nSeñal ${index + 1}:`);
        console.log(`- ID: ${signal.id}`);
        console.log(`- Sequence: ${signal.sequence_number}`);
        console.log(`- Payload:`, JSON.stringify(signal.payload, null, 2));
      });
    }

    // 2. Verificar todas las señales recientes
    const allSignals = await db.execute(sql`
      SELECT 
        fact_type,
        COUNT(*) as count,
        MAX(created_at) as last_created
      FROM fluxcore_signals 
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
      GROUP BY fact_type
      ORDER BY last_created DESC
    `);

    console.log('\n📊 TODAS LAS SEÑALES RECIENTES (últimos 30 min):');
    console.table(allSignals);

    // 3. Verificar el estado del outbox
    const outboxStatus = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count,
        MAX(created_at) as last_created
      FROM chatcore_outbox 
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
      GROUP BY status
      ORDER BY last_created DESC
    `);

    console.log('\n📊 ESTADO DEL OUTBOX:');
    console.table(outboxStatus);

    // 4. Verificar si hay mensajes con signal_id
    const messagesWithSignals = await db.execute(sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(signal_id) as messages_with_signal,
        COUNT(*) - COUNT(signal_id) as messages_without_signal
      FROM messages 
      WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND created_at >= NOW() - INTERVAL '30 minutes'
    `);

    console.log('\n📊 MENSAJES CON SEÑALES:');
    console.table(messagesWithSignals);

    console.log('\n🎯 CONCLUSIÓN:');
    const totalMsg = messagesWithSignals[0]?.total_messages || 0;
    const withSignal = messagesWithSignals[0]?.messages_with_signal || 0;
    const signalRate = totalMsg > 0 ? (withSignal / totalMsg * 100).toFixed(1) : '0';
    
    console.log(`- Total mensajes: ${totalMsg}`);
    console.log(`- Con señal: ${withSignal}`);
    console.log(`- Tasa de certificación: ${signalRate}%`);
    console.log(`- Estado: ${signalRate >= 80 ? '✅ EXCELENTE' : signalRate >= 50 ? '🟡 BUENO' : '❌ NECESITA MEJORA'}`);

  } catch (error) {
    console.error('❌ Error verificando señales:', error);
    throw error;
  }
}

checkChatCoreSignals().catch(console.error);
