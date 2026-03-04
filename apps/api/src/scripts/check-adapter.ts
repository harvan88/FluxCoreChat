import { db, sql } from '@fluxcore/db';

/**
 * Script para verificar el estado del ChatCore Gateway adapter
 */
async function checkAdapter() {
  console.log('🔍 Checking ChatCore Gateway adapter...');

  try {
    const adapters = await db.execute(sql`
      SELECT adapter_id, driver_id, adapter_class, description, adapter_version
      FROM fluxcore_reality_adapters
      WHERE adapter_id = 'chatcore-gateway'
    `);

    console.table(adapters);

    // Verificar signals recientes
    const signals = await db.execute(sql`
      SELECT sequence_number, fact_type, certified_by_adapter, provenance_driver_id, observed_at
      FROM fluxcore_signals
      WHERE certified_by_adapter = 'chatcore-gateway'
        AND observed_at >= NOW() - INTERVAL '10 minutes'
      ORDER BY observed_at DESC
      LIMIT 5
    `);

    console.log('\n📊 Recent signals from chatcore-gateway:');
    console.table(signals);

  } catch (error) {
    console.error('❌ Error checking adapter:', error);
    throw error;
  }
}

checkAdapter().catch(console.error);
