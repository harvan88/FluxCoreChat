import { db, sql } from '@fluxcore/db';

/**
 * Verificar señales reales con el schema correcto
 */
async function checkRealSignals() {
  console.log('🔍 VERIFICANDO SEÑALES REALES');

  try {
    // 1. Verificar señales de ChatCore recientes
    const chatSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        evidence_raw,
        source_namespace,
        source_key,
        certified_by_adapter,
        observed_at
      FROM fluxcore_signals 
      WHERE fact_type = 'chatcore.message.received'
        AND observed_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY sequence_number DESC
      LIMIT 10
    `);

    console.log('\n📊 SEÑALES DE CHATCORE.MESSAGE.RECEIVED:');
    if (chatSignals.length === 0) {
      console.log('❌ No hay señales de chatcore.message.received recientes');
    } else {
      console.log(`✅ Encontradas ${chatSignals.length} señales de ChatCore`);
      chatSignals.forEach((signal, index) => {
        console.log(`\n🔹 Señal ${index + 1}:`);
        console.log(`- Sequence: ${signal.sequence_number}`);
        console.log(`- Source: ${signal.source_namespace}:${signal.source_key}`);
        console.log(`- Adapter: ${signal.certified_by_adapter}`);
        console.log(`- Observed: ${signal.observed_at}`);
        console.log(`- Evidence:`, JSON.stringify(signal.evidence_raw, null, 2));
      });
    }

    // 2. Verificar todas las señales recientes
    const allSignals = await db.execute(sql`
      SELECT 
        fact_type,
        certified_by_adapter,
        COUNT(*) as count,
        MAX(observed_at) as last_observed
      FROM fluxcore_signals 
      WHERE observed_at >= NOW() - INTERVAL '30 minutes'
      GROUP BY fact_type, certified_by_adapter
      ORDER BY count DESC
    `);

    console.log('\n📊 TODAS LAS SEÑALES RECIENTES (últimos 30 min):');
    console.table(allSignals);

    // 3. Verificar mensajes con signal_id
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

    // 4. Verificar el estado del outbox
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

    console.log('\n🎯 CONCLUSIÓN:');
    const totalMsg = Number(messagesWithSignals[0]?.total_messages || 0);
    const withSignal = Number(messagesWithSignals[0]?.messages_with_signal || 0);
    const signalRate = totalMsg > 0 ? (withSignal / totalMsg * 100).toFixed(1) : '0';
    
    console.log(`- Total mensajes: ${totalMsg}`);
    console.log(`- Con señal: ${withSignal}`);
    console.log(`- Tasa de certificación: ${signalRate}%`);
    console.log(`- Estado: ${Number(signalRate) >= 80 ? '✅ EXCELENTE' : Number(signalRate) >= 50 ? '🟡 BUENO' : '❌ NECESITA MEJORA'}`);

    if (chatSignals.length > 0) {
      console.log('\n🎉 ¡LAS SEÑALES DE CHATCORE ESTÁN FUNCIONANDO!');
      console.log('✅ El Kernel está certificando mensajes');
      console.log('✅ El ChatCore Gateway está generando señales');
      console.log('✅ El sistema está alineado con la visión arquitectónica');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkRealSignals().catch(console.error);
