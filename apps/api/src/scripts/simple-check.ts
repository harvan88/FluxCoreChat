import { db, sql } from '@fluxcore/db';

/**
 * Script simple para verificar mensajes recientes
 */
async function simpleCheck() {
  console.log('🔍 Simple check...');

  try {
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

    const messageId = recentMessages[0]?.id;
    if (messageId) {
      const outboxEntries = await db.execute(sql`
        SELECT id, message_id, status, created_at
        FROM chatcore_outbox
        WHERE message_id = '${messageId}'
        ORDER BY created_at DESC
      `);

      console.log('\n📊 Outbox entries for message:');
      console.table(outboxEntries);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

simpleCheck().catch(console.error);
