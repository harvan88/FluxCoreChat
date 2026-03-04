import { db, sql } from '@fluxcore/db';

/**
 * Debug para verificar qué está pasando en message-core cuando encola
 */
async function debugMessageCoreQueue() {
  console.log('🔍 DEBUG DE MESSAGE-CORE QUEUE');

  try {
    // 1. Enviar un mensaje de prueba
    console.log('\n📤 ENVIANDO MENSAJE DE PRUEBA...');
    
    const { messageCore } = await import('../core/message-core');
    
    const result = await messageCore.receive({
      conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
      senderAccountId: '520954df-cd5b-499a-a435-a5c0be4fb4e8',
      content: { text: 'Mensaje de debug para message-core' },
      type: 'incoming',
      generatedBy: 'human',
      timestamp: new Date()
    });

    console.log('✅ Mensaje enviado:', result.messageId);

    // 2. Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Verificar el mensaje creado
    const message = await db.execute(sql`
      SELECT id, sender_account_id, created_at, content
      FROM messages
      WHERE id = '${result.messageId}'
      LIMIT 1
    `);

    if (message.length > 0) {
      console.log('\n📊 MENSAJE CREADO:');
      console.log('- ID:', message[0].id);
      console.log('- sender_account_id:', message[0].sender_account_id);
      console.log('- Created:', message[0].created_at);
    }

    // 4. Verificar el outbox creado
    const outbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, payload
      FROM chatcore_outbox
      WHERE message_id = '${result.messageId}'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (outbox.length > 0) {
      console.log('\n📦 OUTBOX CREADO:');
      console.log('- ID:', outbox[0].id);
      console.log('- Status:', outbox[0].status);
      
      try {
        const payload = JSON.parse(outbox[0].payload);
        console.log('- accountId:', payload.accountId);
        console.log('- userId:', payload.userId);
        
        // 5. Verificar si el accountId coincide
        if (payload.accountId === message[0].sender_account_id) {
          console.log('✅ accountId coincide con sender_account_id');
        } else {
          console.log('❌ accountId NO coincide con sender_account_id');
          console.log('  - Outbox accountId:', payload.accountId);
          console.log('  - Mensaje sender_account_id:', message[0].sender_account_id);
        }
        
      } catch (error) {
        console.log('❌ Error parsing payload:', error);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugMessageCoreQueue().catch(console.error);
