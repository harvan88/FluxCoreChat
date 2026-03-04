import { db, sql } from '@fluxcore/db';

/**
 * Script para verificar entradas recientes del outbox
 */
async function checkRecentOutbox() {
  console.log('🔍 Checking recent outbox entries...');

  try {
    // Verificar todas las entradas recientes
    const recent = await db.execute(sql`
      SELECT id, message_id, status, created_at, sent_at, attempts, last_error
      FROM chatcore_outbox
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('📊 Recent outbox entries:');
    console.table(recent);

    // Verificar si hay mensajes recientes sin signal
    const recentMessages = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, signal_id, created_at
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
        AND generated_by = 'human'
        AND signal_id IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 Recent messages without signal:');
    console.table(recentMessages);

    // Verificar si hay signals recientes
    const recentSignals = await db.execute(sql`
      SELECT sequence_number, fact_type, certified_by_adapter, provenance_driver_id, observed_at
      FROM fluxcore_signals
      WHERE observed_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY observed_at DESC
      LIMIT 5
    `);

    console.log('\n📊 Recent signals:');
    console.table(recentSignals);

  } catch (error) {
    console.error('❌ Error checking recent outbox:', error);
    throw error;
  }
}

checkRecentOutbox().catch(console.error);
