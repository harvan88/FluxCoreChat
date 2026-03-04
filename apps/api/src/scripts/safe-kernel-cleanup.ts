import { db, sql } from '@fluxcore/db';

/**
 * Limpieza segura del Kernel respetando foreign keys
 */
async function safeKernelCleanup() {
  console.log('🔧 LIMPIEZA SEGURA DEL KERNEL');

  try {
    // 1. Desactivar constraints temporalmente
    await db.execute(sql`
      SET session_replication_role = replica;
    `);
    console.log('✅ Foreign keys desactivadas temporalmente');

    // 2. Limpiar en orden correcto
    const cleanupOrder = [
      'fluxcore_projector_errors',
      'fluxcore_cognition_queue',
      'fluxcore_outbox',
      'fluxcore_session_projection',
      'fluxcore_decision_events',
      'fluxcore_external_effects',
      'fluxcore_external_effect_claims',
      'fluxcore_work_events',
      'fluxcore_work_slots',
      'fluxcore_proposed_works',
      'fluxcore_agents',
      'fluxcore_assistants',
      'fluxcore_instructions',
      'fluxcore_assistant_tools',
      'fluxcore_tool_definitions',
      'fluxcore_vector_store_files',
      'fluxcore_vector_store_stats',
      'fluxcore_rag_configurations',
      'fluxcore_document_chunks',
      'fluxcore_query_cache',
      'fluxcore_usage_logs',
      'fluxcore_system_metrics',
      'fluxcore_account_policies',
      'fluxcore_account_actor_contexts',
      'fluxcore_action_audit',
      'fluxcore_actor_address_links',
      'fluxcore_actor_identity_links',
      'fluxcore_addresses',
      'fluxcore_actors',
      'fluxcore_signals'
    ];

    for (const table of cleanupOrder) {
      try {
        await db.execute(sql`DELETE FROM ${table}`);
        console.log(`✅ ${table} limpiada`);
      } catch (error) {
        console.log(`⚠️ No se pudo limpiar ${table}: ${error}`);
      }
    }

    // 3. Resetear cursors de projectors
    await db.execute(sql`
      UPDATE fluxcore_projector_cursors 
      SET last_sequence_number = 0, error_count = 0, last_error = NULL
    `);
    console.log('✅ Cursors reseteados');

    // 4. Resetear signal_id en mensajes
    await db.execute(sql`
      UPDATE messages SET signal_id = NULL
    `);
    console.log('✅ signal_id en mensajes reseteados');

    // 5. Reactivar constraints
    await db.execute(sql`
      SET session_replication_role = DEFAULT;
    `);
    console.log('✅ Foreign keys reactivadas');

    // 6. Verificar estado final
    const signalCount = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_signals`);
    const actorCount = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_actors`);

    console.log(`\n🎯 ESTADO FINAL:`);
    console.log(`- Señales: ${signalCount[0].total}`);
    console.log(`- Actores: ${actorCount[0].total}`);
    console.log(`- Sistema LIMPIO ✅`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

safeKernelCleanup().catch(console.error);
