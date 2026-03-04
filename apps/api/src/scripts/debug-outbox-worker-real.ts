import { db, sql } from '@fluxcore/db';

/**
 * Debug para ver qué está pasando en el outbox worker real
 */
async function debugOutboxWorkerReal() {
  console.log('🔍 DEBUG DEL OUTBOX WORKER REAL');

  try {
    // 1. Crear un outbox pendiente manualmente
    console.log('\n📝 CREANDO OUTBOX PENDIENTE...');
    
    await db.execute(sql`
      INSERT INTO chatcore_outbox (message_id, status, payload, created_at)
      VALUES ('test-manual-123', 'pending', '{"messageId":"test-manual-123","accountId":"a9611c11-70f2-46cd-baef-6afcde715f3a","userId":"520954df-cd5b-499a-a435-a5c0be4fb4e8","payload":{"text":"test manual"},"meta":{"conversationId":"51b841be-1830-4d17-a354-af7f03bee332","messageId":"test-manual-123"}}', NOW())
    `);

    console.log('✅ Outbox pendiente creado');

    // 2. Obtener el ID del outbox creado
    const newOutbox = await db.execute(sql`
      SELECT id, message_id, status, payload
      FROM chatcore_outbox
      WHERE message_id = 'test-manual-123'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (newOutbox.length === 0) {
      console.log('❌ No se encontró el outbox creado');
      return;
    }

    const outbox = newOutbox[0];
    console.log('\n📦 OUTBOX CREADO:');
    console.log('- ID:', outbox.id);
    console.log('- Message ID:', outbox.message_id);
    console.log('- Status:', outbox.status);

    // 3. Parsear payload
    try {
      const payload = JSON.parse(outbox.payload);
      console.log('\n🔍 PAYLOAD DEL OUTBOX:');
      console.log('- accountId:', payload.accountId);
      console.log('- userId:', payload.userId);
      console.log('- payload:', payload.payload);
      console.log('- meta:', !!payload.meta);

      // 4. Simular lo que hace el worker
      console.log('\n🔄 SIMULANDO LO QUE HACE EL WORKER...');
      
      try {
        const { chatCoreGateway } = await import('../services/fluxcore/chatcore-gateway.service');
        
        console.log('📞 LLAMANDO A CHATCORE GATEWAY COMO EL WORKER...');
        
        const result = await chatCoreGateway.certifyIngress({
          accountId: payload.accountId,
          userId: payload.userId,
          payload: payload.payload,
          meta: payload.meta
        });

        console.log('\n✅ RESULTADO:');
        console.log('- accepted:', result.accepted);
        console.log('- signalId:', result.signalId);

        // 5. Actualizar outbox como lo haría el worker
        if (result.accepted) {
          await db.execute(sql`
            UPDATE chatcore_outbox 
            SET status = 'sent', sent_at = NOW() 
            WHERE id = ${outbox.id}
          `);
          console.log('✅ Outbox actualizado a "sent"');
        }

      } catch (error) {
        console.log('❌ Error en ChatCoreGateway:', error);
      }

    } catch (error) {
      console.log('❌ Error parsing payload:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugOutboxWorkerReal().catch(console.error);
