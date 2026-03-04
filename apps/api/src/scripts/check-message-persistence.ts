import { db, sql } from '@fluxcore/db';

/**
 * Verificar si los mensajes realmente persisten en la DB
 */
async function checkMessagePersistence() {
  console.log('🔍 Checking message persistence...');

  try {
    // 1. Verificar mensajes de los últimos 5 minutos
    const recentMessages = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, content, created_at, signal_id
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
        AND generated_by = 'human'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('📊 Recent messages (last 5 minutes):');
    console.table(recentMessages);

    // 2. Verificar si hay mensajes sin signal_id
    const messagesWithoutSignal = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
        AND generated_by = 'human'
        AND signal_id IS NULL
    `);

    console.log('\n📊 Messages without signal_id:');
    console.table(messagesWithoutSignal);

    // 3. Verificar conversación específica
    const conversationMessages = await db.execute(sql`
      SELECT id, content, created_at, signal_id
      FROM messages
      WHERE conversation_id = '744c4c32-10fd-4275-bcdd-8eff9f2785a8'
        AND created_at >= NOW() - INTERVAL '10 minutes'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 Messages in conversation 744c4c32-10fd-4275-bcdd-8eff9f2785a8:');
    console.table(conversationMessages);

    // 4. Verificar si hay logs de errores recientes
    console.log('\n🔍 Recent error patterns to check:');
    console.log('- Look for: "Certification failed"');
    console.log('- Look for: "PostgresError"');
    console.log('- Look for: "rollback"');
    console.log('- Look for: "transaction"');

  } catch (error) {
    console.error('❌ Error checking persistence:', error);
    throw error;
  }
}

checkMessagePersistence().catch(console.error);
