import { db, sql } from '@fluxcore/db';

/**
 * Enviar un mensaje de prueba completo con todos los campos requeridos
 */
async function sendTestMessageComplete() {
  console.log('📤 ENVIANDO MENSAJE DE PRUEBA COMPLETO');

  try {
    // 1. Verificar estado antes
    const beforeSignals = await db.execute(sql`SELECT COUNT(*) as total FROM fluxcore_signals`);
    const beforeMessages = await db.execute(sql`SELECT COUNT(*) as total FROM messages`);
    
    console.log(`📊 ANTES:`);
    console.log(`- Señales: ${beforeSignals[0].total}`);
    console.log(`- Mensajes: ${beforeMessages[0].total}`);

    // 2. Crear payload completo para MessageCore
    const envelope = {
      type: 'message', // 🔑 CAMPO REQUERIDO
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
        messageId: null
      }
    };

    console.log('\n📤 ENVIANDO MENSAJE COMPLETO...');
    console.log('Envelope type:', envelope.type);

    // 3. Llamar a MessageCore.receive
    const { messageCore } = await import('../core/message-core');
    const result = await messageCore.receive(envelope);

    console.log('\n✅ MENSAJE ENVIADO:');
    console.log('- Result:', result);

    // 4. Esperar procesamiento
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

    } else {
      console.log('\n❌ NO SE CREÓ NUEVA SEÑAL');
      
      // Verificar outbox
      const outboxEntries = await db.execute(sql`
        SELECT COUNT(*) as total FROM chatcore_outbox
      `);
      console.log(`📊 Total outbox: ${outboxEntries[0].total}`);
      
      const pendingOutbox = await db.execute(sql`
        SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'pending'
      `);
      console.log(`📊 Outbox pendiente: ${pendingOutbox[0].total}`);
      
      const sentOutbox = await db.execute(sql`
        SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'sent'
      `);
      console.log(`📊 Outbox enviado: ${sentOutbox[0].total}`);
      
      // Verificar mensajes recientes
      const recentMessages = await db.execute(sql`
        SELECT id, created_at, signal_id
        FROM messages
        ORDER BY created_at DESC
        LIMIT 3
      `);
      
      console.log('\n📊 MENSAJES RECIENTES:');
      console.table(recentMessages);
    }

    // 7. Verificar estado de projectors
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

sendTestMessageComplete().catch(console.error);
