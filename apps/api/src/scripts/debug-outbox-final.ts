import { db, sql } from '@fluxcore/db';

/**
 * Debug final del outbox - sin parámetros
 */
async function debugOutboxFinal() {
  console.log('🔍 DEBUG FINAL DEL OUTBOX');

  try {
    // 1. Verificar mensaje recién creado
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

    // 2. Verificar todas las entradas de outbox recientes
    const recentOutbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, sent_at
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 ÚLTIMAS 5 ENTRADAS DE OUTBOX:');
    console.table(recentOutbox);

    // 3. Buscar entrada para nuestro mensaje
    const messageOutbox = recentOutbox.find(entry => entry.message_id === messageId);
    
    if (messageOutbox) {
      console.log('\n✅ ENCONTRADA OUTBOX PARA NUESTRO MENSAJE:');
      console.log('- ID:', messageOutbox.id);
      console.log('- Status:', messageOutbox.status);
      console.log('- Created:', messageOutbox.created_at);
      console.log('- Sent:', messageOutbox.sent_at);
      
      // Obtener payload
      const payloadEntry = await db.execute(sql`
        SELECT payload FROM chatcore_outbox WHERE id = ${messageOutbox.id}
      `);
      
      if (payloadEntry.length > 0) {
        try {
          const payload = JSON.parse(payloadEntry[0].payload);
          console.log('\n🔍 PAYLOAD:');
          console.log('- accountId:', !!payload.accountId);
          console.log('- userId:', !!payload.userId);
          console.log('- meta:', !!payload.meta);
          
          if (payload.meta) {
            console.log('- meta.messageId:', payload.meta.messageId);
            console.log('- meta.conversationId:', payload.meta.conversationId);
          }
        } catch (error) {
          console.log('❌ Error parsing payload:', error);
        }
      }
      
    } else {
      console.log('\n❌ NO HAY ENTRADA DE OUTBOX PARA NUESTRO MENSAJE');
      console.log('Esto significa que el mensaje no se encoló para certificación');
    }

    // 4. Verificar estado general del outbox
    const statusCount = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM chatcore_outbox
      GROUP BY status
    `);

    console.log('\n📊 ESTADO GENERAL DEL OUTBOX:');
    console.table(statusCount);

    // 5. Verificar si hay worker activo (revisando logs recientes)
    console.log('\n🔍 VERIFICANDO WORKER:');
    console.log('Si el worker está activo, deberíamos ver logs como:');
    console.log('- [ChatCoreOutbox] 🔄 Starting certification worker...');
    console.log('- [ChatCoreOutbox] ✅ Certified message xxx');
    console.log('- [ChatCoreGateway] ✅ Certified message');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugOutboxFinal().catch(console.error);
