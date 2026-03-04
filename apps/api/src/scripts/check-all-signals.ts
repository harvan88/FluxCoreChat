import { db, sql } from '@fluxcore/db';

/**
 * Verificar todas las señales existentes
 */
async function checkAllSignals() {
  console.log('🔍 VERIFICANDO TODAS LAS SEÑALES EXISTENTES');

  try {
    // 1. Verificar si hay señales en total
    const totalSignals = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_signals
    `);

    console.log('\n📊 TOTAL DE SEÑALES EN LA BASE DE DATOS:');
    console.table(totalSignals);

    // 2. Verificar las señales más recientes (sin filtro de tiempo)
    const recentSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        source_namespace,
        source_key,
        certified_by_adapter,
        observed_at
      FROM fluxcore_signals 
      ORDER BY sequence_number DESC
      LIMIT 10
    `);

    console.log('\n📊 ÚLTIMAS 10 SEÑALES REGISTRADAS:');
    if (recentSignals.length === 0) {
      console.log('❌ No hay señales en la base de datos');
    } else {
      console.table(recentSignals);
    }

    // 3. Verificar tipos de señales
    const signalTypes = await db.execute(sql`
      SELECT 
        fact_type,
        COUNT(*) as count,
        MAX(observed_at) as last_observed
      FROM fluxcore_signals 
      GROUP BY fact_type
      ORDER BY count DESC
    `);

    console.log('\n📊 TIPOS DE SEÑALES EXISTENTES:');
    console.table(signalTypes);

    // 4. Verificar si hay mensajes con signal_id
    const messagesWithSignals = await db.execute(sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(signal_id) as messages_with_signal,
        COUNT(*) - COUNT(signal_id) as messages_without_signal
      FROM messages 
      WHERE signal_id IS NOT NULL
    `);

    console.log('\n📊 MENSAJES CON SEÑALES (todos los tiempos):');
    console.table(messagesWithSignals);

    // 5. Verificar el outbox completo
    const outboxStatus = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count,
        MAX(created_at) as last_created
      FROM chatcore_outbox 
      GROUP BY status
      ORDER BY last_created DESC
    `);

    console.log('\n📊 ESTADO COMPLETO DEL OUTBOX:');
    console.table(outboxStatus);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAllSignals().catch(console.error);
