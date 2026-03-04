import { db, sql } from '@fluxcore/db';

/**
 * Probar el outbox worker manualmente
 */
async function testOutboxWorker() {
  console.log('🔍 PROBANDO OUTBOX WORKER MANUALMENTE');

  try {
    // 1. Obtener un outbox pendiente
    const pendingOutbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, payload
      FROM chatcore_outbox
      WHERE status = 'pending'
      ORDER BY created_at
      LIMIT 1
    `);

    if (pendingOutbox.length === 0) {
      console.log('❌ No hay outbox pendientes');
      return;
    }

    const outbox = pendingOutbox[0];
    console.log('\n📦 OUTBOX PENDIENTE:');
    console.log('- ID:', outbox.id);
    console.log('- Message ID:', outbox.message_id);
    console.log('- Status:', outbox.status);
    console.log('- Created:', outbox.created_at);

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

      // 4. Si fue aceptado, actualizar el outbox
      if (result.accepted) {
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET status = 'sent', sent_at = NOW() 
          WHERE id = ${outbox.id}
        `);
        console.log('\n✅ OUTBOX ACTUALIZADO A "sent"');
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

testOutboxWorker().catch(console.error);
