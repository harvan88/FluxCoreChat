import { db, sql } from '@fluxcore/db';

/**
 * Verificar qué contiene el payload de outbox
 */
async function checkOutboxPayload() {
  console.log('🔍 VERIFICANDO PAYLOAD DE OUTBOX');

  try {
    // 1. Verificar payload de outbox reciente
    console.log('\n📊 PAYLOADS RECIENTES DE OUTBOX:');
    const outboxPayloads = await db.execute(sql`
      SELECT 
        id,
        message_id,
        status,
        created_at,
        sent_at
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.table(outboxPayloads);

    // 2. Verificar payload completo
    console.log('\n📊 PAYLOAD COMPLETO:');
    const outboxEntries = await db.execute(sql`
      SELECT 
        id,
        message_id,
        status,
        payload
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 3
    `);

    for (const entry of outboxEntries) {
      console.log(`\n📦 Outbox Entry #${entry.id}:`);
      console.log(`Message ID: ${entry.message_id}`);
      console.log(`Status: ${entry.status}`);
      
      try {
        const payload = JSON.parse(entry.payload);
        console.log('Payload:');
        console.log('- accountId:', !!payload.accountId);
        console.log('- userId:', !!payload.userId);
        console.log('- payload:', !!payload.payload);
        console.log('- meta:', !!payload.meta);
        
        if (payload.meta) {
          console.log('- meta.messageId:', payload.meta.messageId);
          console.log('- meta.conversationId:', payload.meta.conversationId);
        }
      } catch (error) {
        console.log('❌ Error parsing payload:', error);
        console.log('Raw payload:', entry.payload);
      }
    }

    // 3. Verificar qué mensaje corresponde a cada outbox
    console.log('\n📊 CORRESPONDENCIA OUTBOX-MENSAJES:');
    for (const entry of outboxEntries) {
      const message = await db.execute(sql`
        SELECT id, content, created_at, signal_id
        FROM messages
        WHERE id = $1
        LIMIT 1
      `, [entry.message_id]);

      if (message.length > 0) {
        console.log(`\n📋 Mensaje ${entry.message_id}:`);
        console.log(`- Creado: ${message[0].created_at}`);
        console.log(`- Signal ID: ${message[0].signal_id}`);
        
        try {
          const content = JSON.parse(message[0].content);
          console.log(`- Texto: ${content.text}`);
        } catch (error) {
          console.log(`- Content: ${message[0].content}`);
        }
      } else {
        console.log(`\n❌ Mensaje ${entry.message_id} no encontrado`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkOutboxPayload().catch(console.error);
