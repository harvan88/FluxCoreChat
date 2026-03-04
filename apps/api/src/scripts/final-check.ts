import { db, sql } from '@fluxcore/db';

/**
 * Verificación final de correlación
 */
async function finalCheck() {
  console.log('🎯 Final correlation check...');

  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) as total_messages,
        COUNT(signal_id) as messages_with_signal,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(signal_id)::numeric / COUNT(*)::numeric * 100), 2)
          ELSE 0 
        END as correlation_rate
      FROM messages
      WHERE generated_by = 'human'
        AND created_at >= NOW() - INTERVAL '10 minutes'
    `);

    console.log('📊 Final correlation check:');
    console.table(result);

    // Verificar signals recientes
    const signals = await db.execute(sql`
      SELECT sequence_number, fact_type, certified_by_adapter, observed_at
      FROM fluxcore_signals
      WHERE observed_at >= NOW() - INTERVAL '10 minutes'
      ORDER BY observed_at DESC
      LIMIT 5
    `);

    console.log('\n📊 Recent signals:');
    console.table(signals);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

finalCheck().catch(console.error);
