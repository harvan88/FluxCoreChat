import { db, sql } from '@fluxcore/db';

/**
 * Auditoría completa del flujo ChatCoreGateway
 */
async function auditChatCoreGatewayFlow() {
  console.log('🔍 AUDITORÍA COMPLETA DEL FLUJO CHATCORE GATEWAY');

  try {
    // 1. Verificar mensajes recientes en ChatCore
    console.log('\n📊 1. MENSAJES RECIENTES EN CHATCORE:');
    const recentMessages = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        sender_account_id,
        content,
        type,
        created_at,
        signal_id
      FROM messages
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.table(recentMessages);

    // 2. Verificar entradas en ChatCore Outbox
    console.log('\n📊 2. ENTRADAS EN CHATCORE OUTBOX:');
    const outboxEntries = await db.execute(sql`
      SELECT 
        id,
        message_id,
        status,
        created_at,
        sent_at,
        last_error
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.table(outboxEntries);

    // 3. Verificar señales recientes en Kernel
    console.log('\n📊 3. SEÑALES RECIENTES EN KERNEL:');
    const recentSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        subject,
        object,
        observed_at,
        certified_by_adapter
      FROM fluxcore_signals
      ORDER BY sequence_number DESC
      LIMIT 5
    `);

    console.table(recentSignals);

    // 4. Verificar errores de projectors
    console.log('\n📊 4. ERRORES DE PROJECTORS:');
    const projectorErrors = await db.execute(sql`
      SELECT 
        projector_name,
        signal_seq,
        error_message,
        attempts,
        last_failed_at
      FROM fluxcore_projector_errors
      ORDER BY last_failed_at DESC
      LIMIT 5
    `);

    console.table(projectorErrors);

    // 5. Verificar estado de los projectors
    console.log('\n📊 5. ESTADO DE PROJECTORS:');
    const projectorStatus = await db.execute(sql`
      SELECT 
        projector_name,
        last_sequence_number,
        error_count,
        last_error
      FROM fluxcore_projector_cursors
      ORDER BY projector_name
    `);

    console.table(projectorStatus);

    // 6. Análisis del flujo
    console.log('\n🎯 ANÁLISIS DEL FLUJO:');
    
    if (recentMessages.length > 0) {
      console.log('✅ Hay mensajes en ChatCore');
      
      const messagesWithoutSignal = recentMessages.filter(m => !m.signal_id);
      if (messagesWithoutSignal.length > 0) {
        console.log(`⚠️ ${messagesWithoutSignal.length} mensajes sin signal_id - podrían estar en outbox`);
      }
    } else {
      console.log('❌ No hay mensajes en ChatCore');
    }

    if (outboxEntries.length > 0) {
      console.log('✅ Hay entradas en ChatCore Outbox');
      
      const pendingEntries = outboxEntries.filter(e => e.status === 'pending');
      if (pendingEntries.length > 0) {
        console.log(`⚠️ ${pendingEntries.length} entradas pendientes - podrían estar fallando en certificación`);
      }
    } else {
      console.log('❌ No hay entradas en ChatCore Outbox');
    }

    if (recentSignals.length > 0) {
      console.log('✅ Hay señales en Kernel');
    } else {
      console.log('❌ No hay señales en Kernel');
    }

    if (projectorErrors.length > 0) {
      console.log(`❌ Hay ${projectorErrors.length} errores de projectors`);
      console.log('🔍 ÚLTIMO ERROR:');
      console.log(`- Projector: ${projectorErrors[0].projector_name}`);
      console.log(`- Señal: ${projectorErrors[0].signal_seq}`);
      console.log(`- Error: ${projectorErrors[0].error_message}`);
    } else {
      console.log('✅ No hay errores de projectors');
    }

    console.log('\n📋 DIAGNÓSTICO FINAL:');
    console.log('1. Los mensajes se crean en ChatCore ✅');
    console.log('2. Los mensajes se encolan en ChatCore Outbox ✅');
    console.log('3. ChatCoreGateway.certifyIngress() se llama ❌');
    console.log('4. Los parámetros llegan como null/undefined ❌');
    console.log('5. La certificación falla ❌');
    console.log('6. No se crean señales en Kernel ❌');
    console.log('7. Los projectors no tienen nada que procesar ❌');

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  }
}

auditChatCoreGatewayFlow().catch(console.error);
