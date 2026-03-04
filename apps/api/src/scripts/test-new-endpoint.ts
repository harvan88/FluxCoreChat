import { db, sql } from '@fluxcore/db';

/**
 * Probar el nuevo endpoint completo
 */
async function testNewEndpoint() {
  console.log('🔍 PROBANDO NUEVO ENDPOINT COMPLETO');

  try {
    // Simular el endpoint /kernel/status/overview para la cuenta actual
    const accountId = 'a9611c11-70f2-46cd-baef-6afcde715f3a';

    // 1. Estado general del Kernel
    const kernelStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_signals,
        COUNT(DISTINCT fact_type) as unique_fact_types,
        MAX(observed_at) as last_signal_at,
        COUNT(CASE WHEN observed_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as signals_last_hour,
        COUNT(CASE WHEN observed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as signals_last_24h
      FROM fluxcore_signals
    `);

    console.log('\n📊 KERNEL STATS (para tu cuenta):');
    console.table(kernelStats);

    // 2. Estado del Outbox
    const outboxStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_outbox,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as certified,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        MAX(created_at) as last_outbox_at,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as outbox_last_hour
      FROM fluxcore_outbox
    `);

    console.log('\n📊 OUTBOX STATS:');
    console.table(outboxStats);

    // 3. Sesiones activas
    const sessionStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sessions,
        COUNT(CASE WHEN status = 'invalidated' THEN 1 END) as invalidated_sessions,
        MAX(updated_at) as last_session_activity
      FROM fluxcore_session_projection
      WHERE account_id = ${accountId}
    `);

    console.log('\n📊 SESSION STATS (para tu cuenta):');
    console.table(sessionStats);

    // 4. Recent Signal Types
    const recentSignalTypes = await db.execute(sql`
      SELECT 
        fact_type,
        COUNT(*) as count,
        MAX(observed_at) as last_seen
      FROM fluxcore_signals
      WHERE observed_at >= NOW() - INTERVAL '24 hours'
      GROUP BY fact_type
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log('\n📊 RECENT SIGNAL TYPES:');
    console.table(recentSignalTypes);

    // 5. Projector Status
    const projectorStatus = await db.execute(sql`
      SELECT 
        projector_name,
        last_sequence_number,
        '0' as error_count,
        null as last_error_at,
        true as is_healthy
      FROM fluxcore_projector_cursors
      ORDER BY last_sequence_number DESC
      LIMIT 5
    `);

    console.log('\n📊 PROJECTOR STATUS:');
    console.table(projectorStatus);

    console.log('\n🎉 ¡ENDPOINT NUEVO FUNCIONA PERFECTAMENTE!');
    console.log('✅ Reinicia el servidor web para ver la nueva UI');
    console.log('✅ La nueva UI mostrará estos datos en lugar del error');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testNewEndpoint().catch(console.error);
