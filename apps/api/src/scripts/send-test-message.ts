import { db, sql } from '@fluxcore/db';

/**
 * Enviar un mensaje de prueba y verificar si genera señal
 */
async function sendTestMessage() {
  console.log('📤 ENVIANDO MENSAJE DE PRUEBA');

  try {
    // 1. Verificar estado antes
    const beforeSignals = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_signals`);
    const beforeMessages = await db.execute(sql`SELECT COUNT(*) as total FROM messages`);
    
    console.log(`📊 ANTES:`);
    console.log(`- Señales: ${beforeSignals[0].total}`);
    console.log(`- Mensajes: ${beforeMessages[0].total}`);

    // 2. Enviar mensaje de prueba vía API
    const testPayload = {
      conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
      senderAccountId: 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe',
      content: {
        text: 'Mensaje de prueba para verificar señal #239'
      }
    };

    console.log('\n📤 ENVIANDO MENSAJE...');
    console.log('Payload:', testPayload);

    // 3. Llamar a la API interna
    const { messageCore } = await import('../core/message-core');
    const result = await messageCore.sendMessage({
      conversationId: testPayload.conversationId,
      senderAccountId: testPayload.senderAccountId,
      content: testPayload.content,
      channel: 'web'
    });

    console.log('\n✅ MENSAJE ENVIADO:');
    console.log('- Message ID:', result.messageId);
    console.log('- Created:', result.created);

    // 4. Esperar un momento para que se procese
    console.log('\n⏳ ESPERANDO PROCESAMIENTO...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Verificar estado después
    const afterSignals = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_signals`);
    const afterMessages = await db.execute(sql`SELECT COUNT(*) as total FROM messages`);
    
    console.log(`\n📊 DESPUÉS:`);
    console.log(`- Señales: ${afterSignals[0].total} (+${afterSignals[0].total - beforeSignals[0].total})`);
    console.log(`- Mensajes: ${afterMessages[0].total} (+${afterMessages[0].total - beforeMessages[0].total})`);

    // 6. Verificar si hay nueva señal
    if (afterSignals[0].total > beforeSignals[0].total) {
      console.log('\n🎉 ¡NUEVA SEÑAL CREADA!');
      
      // Obtener la última señal
      const latestSignal = await db.execute(sql`
        SELECT sequence_number, fact_type, observed_at, certified_by_adapter, evidence_raw
        FROM fluxcore_signals
        ORDER BY sequence_number DESC
        LIMIT 1
      `);

      console.log('\n📊 ÚLTIMA SEÑAL:');
      console.table(latestSignal);

      // Verificar si tiene messageId
      try {
        const evidence = JSON.parse(latestSignal[0].evidence_raw);
        console.log('\n🔍 EVIDENCE:');
        console.log('- messageId:', evidence.meta?.messageId);
        console.log('- conversationId:', evidence.context?.conversationId);
      } catch (error) {
        console.log('❌ Error parsing evidence:', error);
      }

      // 7. Verificar si el mensaje tiene signal_id
      const messageWithSignal = await db.execute(sql`
        SELECT id, signal_id, created_at
        FROM messages
        WHERE id = $1
        LIMIT 1
      `, [result.messageId]);

      console.log('\n📊 MENSAJE CREADO:');
      console.table(messageWithSignal);

    } else {
      console.log('\n❌ NO SE CREÓ NUEVA SEÑAL');
    }

    // 8. Verificar estado de projectors
    const cursors = await db.execute(sql`
      SELECT projector_name, last_sequence_number, error_count
      FROM fluxcore_projector_cursors
      ORDER BY projector_name
    `);

    console.log('\n📊 ESTADO DE PROJECTORS:');
    console.table(cursors);

    // 9. Verificar outbox
    const outboxCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'pending'
    `);

    console.log(`\n📊 OUTBOX PENDIENTE: ${outboxCount[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

sendTestMessage().catch(console.error);
