import { db, sql } from '@fluxcore/db';

/**
 * Verificar el schema real de fluxcore_signals
 */
async function checkSignalsSchema() {
  console.log('🔍 VERIFICANDO SCHEMA DE FLUXCORE_SIGNALS');

  try {
    // 1. Verificar estructura de la tabla
    const tableStructure = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_signals'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESTRUCTURA DE FLUXCORE_SIGNALS:');
    console.table(tableStructure);

    // 2. Verificar señales recientes con columnas correctas
    const recentSignals = await db.execute(sql`
      SELECT 
        fact_type,
        sequence_number,
        payload,
        created_at
      FROM fluxcore_signals 
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY sequence_number DESC
      LIMIT 5
    `);

    console.log('\n📊 SEÑALES RECIENTES:');
    if (recentSignals.length === 0) {
      console.log('❌ No hay señales recientes');
    } else {
      console.table(recentSignals);
      recentSignals.forEach((signal, index) => {
        console.log(`\nSeñal ${index + 1}:`);
        console.log(`- Type: ${signal.fact_type}`);
        console.log(`- Sequence: ${signal.sequence_number}`);
        console.log(`- Created: ${signal.created_at}`);
        if (signal.fact_type === 'chatcore.message.received') {
          console.log(`- Payload:`, JSON.stringify(signal.payload, null, 2));
        }
      });
    }

    // 3. Conteo por tipo
    const signalTypes = await db.execute(sql`
      SELECT 
        fact_type,
        COUNT(*) as count,
        MAX(created_at) as last_created
      FROM fluxcore_signals 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY fact_type
      ORDER BY count DESC
    `);

    console.log('\n📊 SEÑALES POR TIPO (última hora):');
    console.table(signalTypes);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkSignalsSchema().catch(console.error);
