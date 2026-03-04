import { db, sql } from '@fluxcore/db';

/**
 * Verificación de últimos 15 minutos
 */
async function last15Minutes() {
  console.log('🔍 Last 15 minutes check...');

  try {
    const signals = await db.execute(sql`
      SELECT COUNT(*) as count FROM fluxcore_signals 
      WHERE observed_at >= NOW() - INTERVAL '15 minutes'
    `);

    console.log('📊 Signals in last 15 minutes:');
    console.table(signals);

    const messages = await db.execute(sql`
      SELECT COUNT(*) as count FROM messages 
      WHERE created_at >= NOW() - INTERVAL '15 minutes'
        AND generated_by = 'human'
    `);

    console.log('📊 Human messages in last 15 minutes:');
    console.table(messages);

    const outbox = await db.execute(sql`
      SELECT status, COUNT(*) as count FROM chatcore_outbox
      WHERE created_at >= NOW() - INTERVAL '15 minutes'
      GROUP BY status
    `);

    console.log('📊 Outbox entries in last 15 minutes:');
    console.table(outbox);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

last15Minutes().catch(console.error);
