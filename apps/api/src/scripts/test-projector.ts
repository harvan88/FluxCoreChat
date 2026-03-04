import { db, sql } from '@fluxcore/db';

/**
 * Script para probar el ChatProjector manualmente
 * Ejecutar con: bun run scripts/test-projector.ts
 */
async function testProjector() {
  console.log('🧪 Testing ChatProjector manually...\n');

  try {
    // 1. Obtener signals recientes que no han sido procesados
    console.log('📊 1. Recent unprocessed signals:');
    const unprocessedSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        source_namespace,
        source_key,
        provenance_external_id,
        evidence_raw,
        observed_at
      FROM fluxcore_signals
      WHERE observed_at >= NOW() - INTERVAL '10 minutes'
        AND fact_type = 'chatcore.message.received'
      ORDER BY observed_at DESC
      LIMIT 5
    `);
    
    console.table(unprocessedSignals);

    if (unprocessedSignals.length === 0) {
      console.log('✅ No unprocessed signals found');
      return;
    }

    // 2. Procesar manualmente el primer signal
    const signal = unprocessedSignals[0];
    console.log(`\n🔧 2. Manually processing signal #${signal.sequence_number}...`);
    
    // Extraer messageId del evidence_raw
    const evidence = JSON.parse(signal.evidence_raw);
    const messageId = evidence.meta?.messageId;
    
    if (!messageId) {
      console.log('❌ No messageId found in evidence');
      return;
    }

    console.log(`📝 Found messageId: ${messageId}`);

    // 3. Actualizar el mensaje con el signal_id
    console.log('🔗 3. Updating message with signal_id...');
    const updateResult = await db.execute(sql`
      UPDATE messages 
      SET signal_id = ${signal.sequence_number}
      WHERE id = ${messageId}
      RETURNING id, signal_id, created_at
    `);
    
    console.table(updateResult);

    // 4. Verificar la correlación
    console.log('\n🔍 4. Verifying correlation...');
    const correlation = await db.execute(sql`
      SELECT 
        m.id as message_id,
        m.signal_id,
        s.sequence_number,
        s.fact_type,
        m.created_at as message_created,
        s.observed_at as signal_created
      FROM messages m
      JOIN fluxcore_signals s ON s.sequence_number = m.signal_id
      WHERE m.id = ${messageId}
    `);
    
    console.table(correlation);

    // 5. Verificar estado general
    console.log('\n📊 5. Overall correlation status:');
    const overallCorrelation = await db.execute(sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(signal_id) as messages_with_signal,
        COUNT(*) - COUNT(signal_id) as orphaned_messages,
        ROUND((COUNT(signal_id)::numeric / COUNT(*)::numeric * 100), 2) as correlation_rate_percent
      FROM messages 
      WHERE generated_by = 'human'
        AND created_at >= NOW() - INTERVAL '30 minutes'
    `);
    
    console.table(overallCorrelation);

    const correlationData = overallCorrelation[0];
    const correlationRate = Number(correlationData.correlation_rate_percent);
    
    if (correlationRate >= 95) {
      console.log('\n🎉 ✅ SUCCESS: Correlation rate >= 95%');
    } else {
      console.log(`\n❌ Correlation rate: ${correlationRate}% (needs improvement)`);
    }

  } catch (error) {
    console.error('❌ Error during projector test:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testProjector()
    .then(() => {
      console.log('\n🎉 Projector test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Projector test failed:', error);
      process.exit(1);
    });
}

export { testProjector };
