import { db, sql } from '@fluxcore/db';

/**
 * Script para verificar el flujo ChatCore → Kernel
 * Ejecutar con: bun run scripts/verify-chatcore-flow.ts
 */
async function verifyChatCoreFlow() {
  console.log('🔍 Verifying ChatCore → Kernel flow...\n');

  try {
    // 1. Verificar correlación mensaje-signal
    console.log('📊 1. Message-Signal Correlation:');
    const correlation = await db.execute(sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(signal_id) as messages_with_signal,
        COUNT(*) - COUNT(signal_id) as orphaned_messages,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(signal_id)::numeric / COUNT(*)::numeric * 100), 2)
          ELSE 0 
        END as correlation_rate_percent
      FROM messages 
      WHERE generated_by = 'human'
        AND created_at >= NOW() - INTERVAL '30 minutes'
    `);
    
    console.table(correlation);

    // 2. Verificar factTypes
    console.log('\n📊 2. FactTypes Distribution:');
    const factTypes = await db.execute(sql`
      SELECT 
        fact_type,
        COUNT(*) as count
      FROM fluxcore_signals 
      WHERE observed_at >= NOW() - INTERVAL '30 minutes'
      GROUP BY fact_type
      ORDER BY count DESC
    `);
    
    console.table(factTypes);

    // 3. Verificar samples de correlación
    console.log('\n📊 3. Correlation Samples:');
    const samples = await db.execute(sql`
      SELECT 
        m.id as message_id,
        m.conversation_id,
        m.signal_id,
        s.sequence_number,
        s.fact_type,
        s.provenance_external_id,
        m.created_at as message_created,
        s.observed_at as signal_created
      FROM messages m
      LEFT JOIN fluxcore_signals s ON s.sequence_number = m.signal_id
      WHERE m.generated_by = 'human'
        AND m.created_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY m.created_at DESC
      LIMIT 5
    `);
    
    console.table(samples);

    // 4. Verificar outbox status
    console.log('\n📊 4. Outbox Status:');
    const outboxStatus = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM fluxcore_outbox
      GROUP BY status
      ORDER BY status
    `);
    
    console.table(outboxStatus);

    // 5. Verificar mensajes recientes sin signal
    console.log('\n📊 5. Recent Messages Without Signal:');
    const orphanedMessages = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        sender_account_id,
        created_at
      FROM messages
      WHERE generated_by = 'human'
        AND signal_id IS NULL
        AND created_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (orphanedMessages.length === 0) {
      console.log('✅ No orphaned messages found');
    } else {
      console.table(orphanedMessages);
    }

    // 6. Evaluación final
    console.log('\n🎯 6. Final Evaluation:');
    const correlationData = correlation[0];
    const correlationRate = Number(correlationData.correlation_rate_percent);
    const totalMessages = Number(correlationData.total_messages);
    const messagesWithSignal = Number(correlationData.messages_with_signal);
    const orphanedMessagesCount = Number(correlationData.orphaned_messages);
    
    console.log(`📈 Correlation Rate: ${correlationRate}%`);
    console.log(`📈 Total Messages: ${totalMessages}`);
    console.log(`📈 Messages with Signal: ${messagesWithSignal}`);
    console.log(`📈 Orphaned Messages: ${orphanedMessagesCount}`);
    
    // Verificar factType correcto
    const chatcoreFactTypes = factTypes.filter(row => row.fact_type === 'chatcore.message.received');
    const chatcoreCount = chatcoreFactTypes.length > 0 ? Number(chatcoreFactTypes[0].count) : 0;
    
    console.log(`📈 ChatCore Signals: ${chatcoreCount}`);
    
    // Criterios de éxito
    const success = correlationRate >= 95 && orphanedMessagesCount === 0 && chatcoreCount > 0;
    
    if (success) {
      console.log('\n🎉 ✅ SUCCESS: ChatCore → Kernel flow is working correctly!');
      console.log('   - Correlation rate >= 95% ✅');
      console.log('   - No orphaned messages ✅');
      console.log('   - ChatCore factType detected ✅');
    } else {
      console.log('\n❌ FAILURE: Issues detected in ChatCore → Kernel flow');
      if (correlationRate < 95) console.log(`   - Correlation rate < 95% (${correlationRate}%) ❌`);
      if (orphanedMessagesCount > 0) console.log(`   - ${orphanedMessagesCount} orphaned messages ❌`);
      if (chatcoreCount === 0) console.log('   - No ChatCore signals detected ❌');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyChatCoreFlow()
    .then(() => {
      console.log('\n🎉 Verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

export { verifyChatCoreFlow };
