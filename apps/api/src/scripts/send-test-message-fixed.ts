import { db, sql } from '@fluxcore/db';

/**
 * Enviar un mensaje de prueba y verificar si genera señal - versión corregida
 */
async function sendTestMessageFixed() {
  console.log('📤 ENVIANDO MENSAJE DE PRUEBA - VERSIÓN CORREGIDA');

  try {
    // 1. Verificar estado antes
    const beforeSignals = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_signals`);
    const beforeMessages = await db.execute(sql`SELECT COUNT(*) as total FROM messages`);
    
    console.log(`📊 ANTES:`);
    console.log(`- Señales: ${beforeSignals[0].total}`);
    console.log(`- Mensajes: ${beforeMessages[0].total}`);

    // 2. Crear payload para MessageCore
    const envelope = {
      source: 'web',
      conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
      senderAccountId: 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe',
      targetAccountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
      content: {
        text: 'Mensaje de prueba para verificar señal #239'
      },
      metadata: {
        ip: '127.0.0.1',
        userAgent: 'Test Script',
        clientTimestamp: new Date().toISOString(),
        requestId: 'test-request-signal-239',
        humanSenderId: 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe',
        messageId: null // Se generará automáticamente
      }
    };

    console.log('\n📤 ENVIANDO MENSAJE...');
    console.log('Envelope:', envelope);

    // 3. Llamar a MessageCore.receive
    const { messageCore } = await import('../core/message-core');
    const result = await messageCore.receive(envelope);

    console.log('\n✅ MENSAJE ENVIADO:');
    console.log('- Message ID:', result.messageId);
    console.log('- Status:', result.status);
    console.log('- Created:', result.created);

    // 4. Esperar un momento para que se procese
    console.log('\n⏳ ESPERANDO PROCESAMIENTO (3 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

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
        console.log('- accountId:', evidence.accountId);
      } catch (error) {
        console.log('❌ Error parsing evidence:', error);
      }

      // 7. Verificar si el mensaje tiene signal_id
      const messageWithSignal = await db.execute(sql`
        SELECT id, signal_id, created_at, content
        FROM messages
        WHERE id = $1
        LIMIT 1
      `, [result.messageId]);

      console.log('\n📊 MENSAJE CREADO:');
      console.table(messageWithSignal);

      if (messageWithSignal[0]?.signal_id) {
        console.log(`✅ Mensaje vinculado a señal #${messageWithSignal[0].signal_id}`);
      } else {
        console.log('❌ Mensaje no vinculado a señal');
      }

    } else {
      console.log('\n❌ NO SE CREÓ NUEVA SEÑAL');
      
      // Verificar outbox pendiente
      const pendingOutbox = await db.execute(sql`
        SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'pending'
      `);
      console.log(`📊 Outbox pendiente: ${pendingOutbox[0].total}`);
      
      if (pendingOutbox[0].total > 0) {
        console.log('⚠️ Hay mensajes en outbox pendientes de procesar');
      }
    }

    // 8. Verificar estado de projectors
    const cursors = await db.execute(sql`
      SELECT projector_name, last_sequence_number, error_count
      FROM fluxcore_projector_cursors
      ORDER BY projector_name
    `);

    console.log('\n📊 ESTADO DE PROJECTORS:');
    console.table(cursors);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

sendTestMessageFixed().catch(console.error);
