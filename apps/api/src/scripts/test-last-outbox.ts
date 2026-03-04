import { db, sql } from '@fluxcore/db';

/**
 * Probar el último outbox procesado
 */
async function testLastOutbox() {
  console.log('🔍 PROBANDO EL ÚLTIMO OUTBOX PROCESADO');

  try {
    // 1. Obtener el último outbox
    const lastOutbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, sent_at, payload
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (lastOutbox.length === 0) {
      console.log('❌ No hay outbox');
      return;
    }

    const outbox = lastOutbox[0];
    console.log('\n📦 ÚLTIMO OUTBOX:');
    console.log('- ID:', outbox.id);
    console.log('- Message ID:', outbox.message_id);
    console.log('- Status:', outbox.status);
    console.log('- Created:', outbox.created_at);
    console.log('- Sent:', outbox.sent_at);

    // 2. Parsear payload
    try {
      const payload = JSON.parse(outbox.payload);
      console.log('\n🔍 PAYLOAD:');
      console.log('- accountId:', payload.accountId);
      console.log('- userId:', payload.userId);
      console.log('- meta:', !!payload.meta);
      
      if (payload.meta) {
        console.log('- meta.messageId:', payload.meta.messageId);
        console.log('- meta.conversationId:', payload.meta.conversationId);
      }

      // 3. Llamar manualmente a ChatCoreGateway
      console.log('\n📞 LLAMANDO A CHATCORE GATEWAY...');
      
      const { chatCoreGateway } = await import('../services/fluxcore/chatcore-gateway.service');
      
      const result = await chatCoreGateway.certifyIngress({
        accountId: payload.accountId,
        userId: payload.userId,
        payload: payload.payload,
        meta: payload.meta
      });

      console.log('\n✅ RESULTADO DE CHATCORE GATEWAY:');
      console.log('- accepted:', result.accepted);
      console.log('- signalId:', result.signalId);
      console.log('- reason:', result.reason);

      // 4. Si fue aceptado, verificar la señal
      if (result.accepted && result.signalId) {
        const signal = await db.execute(sql`
          SELECT sequence_number, fact_type, observed_at
          FROM fluxcore_signals
          WHERE sequence_number = ${result.signalId}
          LIMIT 1
        `);

        if (signal.length > 0) {
          console.log('\n🎉 ¡SEÑAL ENCONTRADA!');
          console.log('- Sequence:', signal[0].sequence_number);
          console.log('- Fact Type:', signal[0].fact_type);
          console.log('- Observed At:', signal[0].observed_at);
        } else {
          console.log('\n❌ SEÑAL NO ENCONTRADA (aunque se retornó signalId)');
        }
      }

    } catch (error) {
      console.error('❌ Error parsing payload:', error);
      console.log('Raw payload:', outbox.payload);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testLastOutbox().catch(console.error);
