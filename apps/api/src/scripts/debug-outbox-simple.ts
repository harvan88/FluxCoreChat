import { db, sql } from '@fluxcore/db';

/**
 * Debug simple del outbox
 */
async function debugOutboxSimple() {
  console.log('🔍 DEBUG SIMPLE DEL OUTBOX');

  try {
    // 1. Verificar el mensaje recién creado
    const recentMessage = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, created_at, signal_id
      FROM messages
      ORDER BY created_at DESC
      LIMIT 1
    `);

    console.log('\n📊 MENSAJE RECIENTE:');
    console.table(recentMessage);

    const messageId = recentMessage[0]?.id;
    if (!messageId) {
      console.log('❌ No hay mensajes recientes');
      return;
    }

    // 2. Verificar si hay entrada en outbox para este mensaje
    const outboxEntry = await db.execute(sql`
      SELECT id, message_id, status, created_at, sent_at, payload
      FROM chatcore_outbox
      WHERE message_id = '${messageId}'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    console.log('\n📊 OUTBOX ENTRY:');
    console.table(outboxEntry);

    if (outboxEntry.length === 0) {
      console.log('❌ No hay entrada en outbox para este mensaje');
      
      // Verificar todas las entradas de outbox
      const allOutbox = await db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM chatcore_outbox
        GROUP BY status
      `);
      
      console.log('\n📊 ESTADO GENERAL DEL OUTBOX:');
      console.table(allOutbox);
      
      // Verificar las últimas 5 entradas
      const lastOutbox = await db.execute(sql`
        SELECT id, message_id, status, created_at
        FROM chatcore_outbox
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      console.log('\n📊 ÚLTIMAS 5 ENTRADAS DE OUTBOX:');
      console.table(lastOutbox);
      
      return;
    }

    // 3. Analizar el payload
    try {
      const payload = JSON.parse(outboxEntry[0].payload);
      console.log('\n🔍 PAYLOAD ANALYSIS:');
      console.log('- accountId:', !!payload.accountId);
      console.log('- userId:', !!payload.userId);
      console.log('- payload:', !!payload.payload);
      console.log('- meta:', !!payload.meta);
      
      if (payload.meta) {
        console.log('- meta.messageId:', payload.meta.messageId);
        console.log('- meta.conversationId:', payload.meta.conversationId);
        console.log('- meta.requestId:', payload.meta.requestId);
      }
      
    } catch (error) {
      console.log('❌ Error parsing payload:', error);
      console.log('Raw payload:', outboxEntry[0].payload);
    }

    // 4. Verificar estado del outbox
    const pendingCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'pending'
    `);
    
    const processingCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'processing'
    `);
    
    const sentCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'sent'
    `);
    
    console.log(`\n📊 OUTBOX STATUS:`);
    console.log(`- Pending: ${pendingCount[0].total}`);
    console.log(`- Processing: ${processingCount[0].total}`);
    console.log(`- Sent: ${sentCount[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugOutboxSimple().catch(console.error);
