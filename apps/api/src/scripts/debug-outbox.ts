import { db, sql } from '@fluxcore/db';

/**
 * Script para debug del ChatCore Outbox
 * Ejecutar con: bun run scripts/debug-outbox.ts
 */
async function debugOutbox() {
  console.log('🔍 Debugging ChatCore Outbox...\n');

  try {
    // 1. Verificar chatcore_outbox
    console.log('📊 1. ChatCore Outbox Status:');
    const chatcoreOutbox = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count,
        MAX(created_at) as last_created
      FROM chatcore_outbox
      GROUP BY status
      ORDER BY status
    `);
    
    console.table(chatcoreOutbox);

    // 2. Verificar entradas recientes en chatcore_outbox
    console.log('\n📊 2. Recent ChatCore Outbox Entries:');
    const recentChatcoreOutbox = await db.execute(sql`
      SELECT 
        id,
        message_id,
        status,
        created_at,
        sent_at,
        attempts,
        last_error
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.table(recentChatcoreOutbox);

    // 3. Verificar fluxcore_outbox
    console.log('\n📊 3. FluxCore Outbox Status:');
    const fluxcoreOutbox = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count,
        MAX(created_at) as last_created
      FROM fluxcore_outbox
      GROUP BY status
      ORDER BY status
    `);
    
    console.table(fluxcoreOutbox);

    // 4. Verificar entradas recientes en fluxcore_outbox
    console.log('\n📊 4. Recent FluxCore Outbox Entries:');
    const recentFluxcoreOutbox = await db.execute(sql`
      SELECT 
        id,
        signal_id,
        event_type,
        status,
        created_at,
        sent_at,
        attempts,
        last_error
      FROM fluxcore_outbox
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.table(recentFluxcoreOutbox);

    // 5. Verificar mensajes recientes
    console.log('\n📊 5. Recent Messages:');
    const recentMessages = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        sender_account_id,
        generated_by,
        signal_id,
        created_at
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.table(recentMessages);

    // 6. Verificar si hay signals recientes
    console.log('\n📊 6. Recent Signals:');
    const recentSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        source_namespace,
        source_key,
        provenance_external_id,
        observed_at
      FROM fluxcore_signals
      WHERE observed_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY observed_at DESC
      LIMIT 10
    `);
    
    console.table(recentSignals);

    // 7. Diagnóstico
    console.log('\n🎯 7. Diagnosis:');
    
    const chatcorePending = chatcoreOutbox.find(row => row.status === 'pending')?.count || 0;
    const fluxcorePending = fluxcoreOutbox.find(row => row.status === 'pending')?.count || 0;
    const totalMessages = recentMessages.length;
    const totalSignals = recentSignals.length;
    
    console.log(`📈 ChatCore Outbox Pending: ${chatcorePending}`);
    console.log(`📈 FluxCore Outbox Pending: ${fluxcorePending}`);
    console.log(`📈 Total Messages: ${totalMessages}`);
    console.log(`📈 Total Signals: ${totalSignals}`);
    
    if (totalMessages > 0 && totalSignals === 0 && chatcorePending > 0) {
      console.log('\n🔍 ISSUE: ChatCore Outbox has pending entries but no signals created');
      console.log('   → ChatCore Outbox Worker may not be running');
      console.log('   → chatCoreGateway.certifyIngress() may be failing');
    } else if (totalMessages > 0 && totalSignals === 0 && chatcorePending === 0) {
      console.log('\n🔍 ISSUE: Messages created but no ChatCore Outbox entries');
      console.log('   → messageCore.receive() may not be enqueuing to outbox');
      console.log('   → ChatCore Outbox Service may not be working');
    } else if (totalMessages > 0 && totalSignals > 0 && fluxcorePending > 0) {
      console.log('\n🔍 ISSUE: Signals created but FluxCore Outbox not processing');
      console.log('   → KernelDispatcher may not be running');
    } else {
      console.log('\n✅ No obvious issues detected');
    }

  } catch (error) {
    console.error('❌ Error during debug:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugOutbox()
    .then(() => {
      console.log('\n🎉 Debug completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug failed:', error);
      process.exit(1);
    });
}

export { debugOutbox };
