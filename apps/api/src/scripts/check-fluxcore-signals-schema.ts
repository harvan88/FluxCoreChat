import { db, sql } from '@fluxcore/db';

/**
 * Verificar esquema real de fluxcore_signals
 */
async function checkFluxcoreSignalsSchema() {
  console.log('🔍 VERIFICANDO ESQUEMA REAL DE fluxcore_signals');

  try {
    // 1. Verificar esquema real
    const schema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_signals'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESQUEMA REAL:');
    console.table(schema);

    // 2. Verificar datos actuales
    const data = await db.execute(sql`
      SELECT * FROM fluxcore_signals
      ORDER BY sequence_number DESC
      LIMIT 3
    `);

    console.log('\n📊 DATOS ACTUALES:');
    console.table(data);

    // 3. Verificar si hay señales
    const count = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_signals
    `);

    console.log('\n📊 TOTAL DE SEÑALES:', count[0]?.total || 0);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkFluxcoreSignalsSchema().catch(console.error);
