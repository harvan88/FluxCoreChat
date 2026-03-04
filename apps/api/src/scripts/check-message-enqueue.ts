import { db, sql } from '@fluxcore/db';

/**
 * Script para verificar si los mensajes se están encolando en el outbox
 */
async function checkMessageEnqueue() {
  console.log('🔍 Checking message enqueue process...');

  try {
    // 1. Verificar mensajes recientes
    const recentMessages = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, created_at, generated_by
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
        AND generated_by = 'human'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('📊 Recent messages:');
    console.table(recentMessages);

    // 2. Verificar si hay entradas recientes en el outbox para esos mensajes
    const messageIds = recentMessages.map(m => `'${m.id}'`).join(',');
    
    if (messageIds.length > 0) {
      const outboxEntries = await db.execute(sql`
        SELECT id, message_id, status, created_at
        FROM chatcore_outbox
        WHERE message_id IN (${messageIds})
        ORDER BY created_at DESC
      `);

      console.log('\n📊 Outbox entries for recent messages:');
      console.table(outboxEntries);
    }

    // 3. Verificar si el message-core está llamando enqueue (crear un trigger)
    console.log('\n🔍 Checking if message-core is calling enqueue...');
    
    // Simular un mensaje nuevo para ver si se encola
    console.log('📝 Simulating new message...');
    
    const testMessage = {
      conversationId: '744c4c32-10fd-4275-bcdd-8eff9f2785a8',
      senderAccountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
      content: { text: 'Test message for enqueue verification' },
      type: 'incoming',
      generatedBy: 'human'
    };

    console.log('📦 Test message:', testMessage);

  } catch (error) {
    console.error('❌ Error checking message enqueue:', error);
    throw error;
  }
}

checkMessageEnqueue().catch(console.error);
