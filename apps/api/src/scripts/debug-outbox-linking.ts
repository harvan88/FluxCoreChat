import { db, sql } from '@fluxcore/db';

/**
 * Debug del problema de vinculación entre mensajes y señales
 */
async function debugOutboxLinking() {
  console.log('🔍 DEBUG DEL PROBLEMA DE VINCULACIÓN');

  try {
    // 1. Verificar mensajes recientes sin signal_id
    console.log('\n📊 1. MENSAJES RECIENTES SIN SIGNAL_ID:');
    const messagesWithoutSignal = await db.execute(sql`
      SELECT id, conversation_id, content, created_at, signal_id
      FROM messages
      WHERE signal_id IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.table(messagesWithoutSignal);

    // 2. Verificar si hay señales recientes sin mensaje asociado
    console.log('\n📊 2. SEÑALES RECIENTES SIN MENSAJE:');
    const recentSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        evidence_raw,
        observed_at
      FROM fluxcore_signals
      WHERE sequence_number > 230
      ORDER BY sequence_number DESC
      LIMIT 5
    `);

    console.table(recentSignals);

    // 3. Verificar si las señales tienen messageId en evidence
    console.log('\n📊 3. VERIFICANDO messageId EN EVIDENCE:');
    for (const signal of recentSignals) {
      try {
        const evidence = JSON.parse(signal.evidence_raw);
        console.log(`\nSeñal #${signal.sequence_number}:`);
        console.log(`- messageId: ${evidence.meta?.messageId || 'NO'}`);
        console.log(`- conversationId: ${evidence.context?.conversationId || 'NO'}`);
      } catch (error) {
        console.log(`\n❌ Error parsing evidence de señal #${signal.sequence_number}: ${error}`);
      }
    }

    // 4. Verificar si hay mensajes con el mismo messageId que señales
    console.log('\n📊 4. VERIFICANDO CORRESPONDENCIA:');
    for (const message of messagesWithoutSignal) {
      const content = JSON.parse(message.content);
      console.log(`\nMensaje ${message.id}:`);
      console.log(`- Texto: ${content.text}`);
      console.log(`- Creado: ${message.created_at}`);
      
      // Buscar si hay una señal con este messageId
      const signalWithMessage = await db.execute(sql`
        SELECT sequence_number, fact_type, evidence_raw
        FROM fluxcore_signals
        WHERE evidence_raw::text LIKE '%${message.id}%'
        ORDER BY sequence_number DESC
        LIMIT 1
      `);
      
      if (signalWithMessage.length > 0) {
        console.log(`✅ Encontrada señal #${signalWithMessage[0].sequence_number}`);
      } else {
        console.log(`❌ No hay señal con messageId ${message.id}`);
      }
    }

    // 5. Verificar el flujo de outbox
    console.log('\n📊 5. VERIFICANDO FLUJO DE OUTBOX:');
    const outboxEntries = await db.execute(sql`
      SELECT 
        id,
        message_id,
        status,
        created_at,
        sent_at,
        payload
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.table(outboxEntries);

    // 6. Análisis del problema
    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('❌ PROBLEMA IDENTIFICADO:');
    console.log('   1. Los mensajes se crean sin signal_id');
    console.log('   2. ChatCoreGateway certifica los mensajes');
    console.log('   3. Pero no vincula el mensaje.id con la señal');
    console.log('   4. La señal se crea pero no se asocia al mensaje');

    console.log('\n🔧 SOLUCIÓN:');
    console.log('   - ChatCoreGateway debe extraer messageId del payload');
    console.log('   - Debe incluir messageId en la evidencia de la señal');
    console.log('   - Después de certificar, debe actualizar messages.signal_id');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugOutboxLinking().catch(console.error);
