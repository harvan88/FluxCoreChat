import { db, sql } from '@fluxcore/db';

/**
 * Script para verificar signals recientes
 */
async function checkSignals() {
  console.log('🔍 Checking recent signals...');

  try {
    const signals = await db.execute(sql`
      SELECT sequence_number, fact_type, certified_by_adapter, provenance_driver_id, observed_at
      FROM fluxcore_signals
      WHERE fact_type = 'chatcore.message.received'
        AND observed_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY observed_at DESC
      LIMIT 5
    `);

    console.log('📊 Recent chatcore.message.received signals:');
    console.table(signals);

    // Verificar todos los signals de cualquier tipo
    const allSignals = await db.execute(sql`
      SELECT sequence_number, fact_type, certified_by_adapter, provenance_driver_id, observed_at
      FROM fluxcore_signals
      WHERE observed_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY observed_at DESC
      LIMIT 10
    `);

    console.log('\n📊 All recent signals:');
    console.table(allSignals);

  } catch (error) {
    console.error('❌ Error checking signals:', error);
    throw error;
  }
}

checkSignals().catch(console.error);
