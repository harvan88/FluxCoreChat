import { db, sql } from '@fluxcore/db';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Auditoría completa del Kernel - leer todo el código y comparar con tablas reales
 */
async function comprehensiveKernelAudit() {
  console.log('🔍 AUDITORÍA COMPLETA DEL KERNEL');

  try {
    // 1. Leer todos los archivos del kernel
    const kernelFiles = [
      'apps/api/src/core/kernel/base.projector.ts',
      'apps/api/src/core/kernel/projector-runner.ts',
      'apps/api/src/core/projections/chat-projector.ts',
      'apps/api/src/core/projections/identity-projector.ts',
      'apps/api/src/core/projections/session-projector.ts',
      'apps/api/src/services/fluxcore/chatcore-gateway.service.ts',
      'apps/api/src/services/fluxcore/runtime-gateway.service.ts',
      'apps/api/src/services/fluxcore/runtime.service.ts',
      'apps/api/src/websocket/ws-handler.ts',
      'apps/api/src/bootstrap/kernel.bootstrap.ts',
      'apps/api/src/core/kernel-dispatcher.ts'
    ];

    console.log('\n📚 LEYENDO ARCHIVOS DEL KERNEL:');
    for (const file of kernelFiles) {
      try {
        const content = readFileSync(join(process.cwd(), file), 'utf-8');
        console.log(`\n📄 ${file}:`);
        console.log(`- Tamaño: ${content.length} caracteres`);
        console.log(`- Líneas: ${content.split('\n').length}`);
      } catch (error) {
        console.log(`❌ No se pudo leer ${file}: ${error}`);
      }
    }

    // 2. Auditoría de tablas del kernel
    console.log('\n📊 AUDITORÍA DE TABLAS DEL KERNEL:');
    
    const kernelTables = [
      'fluxcore_signals',
      'fluxcore_actors',
      'fluxcore_projector_cursors',
      'fluxcore_projector_errors',
      'fluxcore_outbox',
      'fluxcore_cognition_queue',
      'fluxcore_session_projection',
      'fluxcore_reality_adapters',
      'fluxcore_semantic_contexts',
      'fluxcore_decision_events',
      'fluxcore_external_effects',
      'fluxcore_external_effect_claims',
      'fluxcore_work_definitions',
      'fluxcore_work_events',
      'fluxcore_work_slots',
      'fluxcore_proposed_works',
      'fluxcore_agents',
      'fluxcore_agent_assistants',
      'fluxcore_assistants',
      'fluxcore_instructions',
      'fluxcore_instruction_versions',
      'fluxcore_assistant_instructions',
      'fluxcore_assistant_tools',
      'fluxcore_tool_definitions',
      'fluxcore_tool_connections',
      'fluxcore_template_settings',
      'fluxcore_vector_stores',
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
      'fluxcore_fact_types',
      'fluxcore_files',
      'fluxcore_marketplace_listings',
      'fluxcore_marketplace_reviews',
      'fluxcore_marketplace_subscriptions',
      'fluxcore_credit_transactions',
      'fluxcore_account_credits'
    ];

    for (const table of kernelTables) {
      try {
        const schema = await db.execute(sql`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = '${table}'
          ORDER BY ordinal_position
        `);

        const count = await db.execute(sql`
          SELECT COUNT(*) as total FROM ${table}
        `);

        console.log(`\n📋 ${table}:`);
        console.log(`- Columnas: ${schema.length}`);
        console.log(`- Registros: ${count[0].total}`);
        console.log(`- Columnas: ${schema.map(r => r.column_name).join(', ')}`);

      } catch (error) {
        console.log(`\n❌ Error en tabla ${table}: ${error}`);
      }
    }

    // 3. Verificar estado actual del sistema
    console.log('\n🎯 ESTADO ACTUAL DEL SISTEMA:');
    
    const signalCount = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_signals`);
    const actorCount = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_actors`);
    const cursorCount = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_projector_cursors`);
    const errorCount = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_projector_errors`);

    console.log(`- Señales: ${signalCount[0].total}`);
    console.log(`- Actores: ${actorCount[0].total}`);
    console.log(`- Cursors: ${cursorCount[0].total}`);
    console.log(`- Errores: ${errorCount[0].total}`);

    // 4. Verificar foreign keys
    console.log('\n🔗 VERIFICANDO FOREIGN KEYS:');
    
    const constraints = await db.execute(sql`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type IN ('FOREIGN KEY') 
        AND (tc.table_name LIKE 'fluxcore_%' OR ccu.table_name LIKE 'fluxcore_%')
    `);

    console.table(constraints);

    // 5. Verificar triggers
    console.log('\n⚡ VERIFICANDO TRIGGERS:');
    
    const triggers = await db.execute(sql`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_timing,
        action_condition,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table LIKE 'fluxcore_%'
    `);

    console.table(triggers);

    console.log('\n🎯 AUDITORÍA COMPLETA FINALIZADA');

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  }
}

comprehensiveKernelAudit().catch(console.error);
