import { db, sql } from '@fluxcore/db';

/**
 * Debug del outbox para el mensaje recién creado
 */
async function debugOutboxForMessage() {
  console.log('🔍 DEBUG DEL OUTBOX PARA MENSAJE RECIENTE');

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
      WHERE message_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [messageId]);

    console.log('\n📊 OUTBOX ENTRY:');
    console.table(outboxEntry);

    if (outboxEntry.length === 0) {
      console.log('❌ No hay entrada en outbox para este mensaje');
      
      // Verificar si el worker está corriendo
      console.log('\n🔍 VERIFICANDO WORKER...');
      
      // Verificar todas las entradas de outbox
      const allOutbox = await db.execute(sql`
        SELECT COUNT(*) as total, status, COUNT(*) as count
        FROM chatcore_outbox
        GROUP BY status
      `);
      
      console.log('\n📊 ESTADO GENERAL DEL OUTBOX:');
      console.table(allOutbox);
      
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

    // 4. Verificar si el worker está procesando
    console.log('\n🔍 VERIFICANDO WORKER STATUS...');
    
    const pendingCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'pending'
    `);
    
    const processingCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'processing'
    `);
    
    const sentCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM chatcore_outbox WHERE status = 'sent'
    `);
    
    console.log(`📊 OUTBOX STATUS:`);
    console.log(`- Pending: ${pendingCount[0].total}`);
    console.log(`- Processing: ${processingCount[0].total}`);
    console.log(`- Sent: ${sentCount[0].total}`);

    // 5. Verificar logs del worker
    console.log('\n🔍 VERIFICANDO SI EL WORKER DEBERÍA ESTAR ACTIVO...');
    console.log('El worker debería estar corriendo si vemos logs como:');
    console.log('[ChatCoreOutbox] 🔄 Starting certification worker...');
    console.log('[ChatCoreOutbox] ✅ Certified message xxx');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugOutboxForMessage().catch(console.error);
