import { db, sql } from '@fluxcore/db';

/**
 * Verificar si el mensaje está vinculado a la señal
 */
async function checkMessageSignalLink() {
  console.log('🔍 VERIFICANDO VINCULACIÓN MENSAJE-SEÑAL');

  try {
    // 1. Verificar el mensaje más reciente
    const recentMessage = await db.execute(sql`
      SELECT id, created_at, signal_id, content
      FROM messages
      ORDER BY created_at DESC
      LIMIT 1
    `);

    console.log('\n📊 MENSAJE MÁS RECIENTE:');
    console.table(recentMessage);

    const messageId = recentMessage[0]?.id;
    if (!messageId) {
      console.log('❌ No hay mensajes recientes');
      return;
    }

    // 2. Verificar la señal #241
    const signal241 = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at, evidence_raw
      FROM fluxcore_signals
      WHERE sequence_number = 241
      LIMIT 1
    `);

    console.log('\n📊 SEÑAL #241:');
    console.table(signal241);

    if (signal241.length > 0) {
      // 3. Verificar si el messageId está en la evidence
      try {
        const evidence = JSON.parse(signal241[0].evidence_raw);
        console.log('\n🔍 EVIDENCE DE SEÑAL #241:');
        console.log('- messageId:', evidence.meta?.messageId);
        console.log('- conversationId:', evidence.context?.conversationId);
        console.log('- accountId:', evidence.accountId);
        
        // 4. Verificar si el messageId coincide
        if (evidence.meta?.messageId === messageId) {
          console.log('\n✅ ¡MESSAGEID COINCIDE!');
          console.log(`- Mensaje: ${messageId}`);
          console.log(`- Señal: ${evidence.meta.messageId}`);
        } else {
          console.log('\n❌ MESSAGEID NO COINCIDE');
          console.log(`- Mensaje: ${messageId}`);
          console.log(`- Señal: ${evidence.meta.messageId}`);
        }
        
      } catch (error) {
        console.log('❌ Error parsing evidence:', error);
      }
    }

    // 5. Verificar si el worker actualizó el signal_id del mensaje
    console.log('\n🔍 VERIFICANDO SI EL WORKER ACTUALIZÓ signal_id:');
    console.log('Revisa el chatcore-outbox.service.ts para ver si actualiza el signal_id');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkMessageSignalLink().catch(console.error);
