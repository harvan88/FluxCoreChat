import { db, sql } from '@fluxcore/db';

/**
 * Debug del payload exacto en el outbox
 */
async function debugOutboxPayload() {
  console.log('🔍 Debug outbox payload...');

  try {
    // Obtener el payload más reciente
    const recent = await db.execute(sql`
      SELECT id, message_id, payload, status, created_at
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (recent.length === 0) {
      console.log('❌ No outbox entries found');
      return;
    }

    const entry = recent[0];
    console.log('📊 Recent outbox entry:');
    console.log('ID:', entry.id);
    console.log('Message ID:', entry.message_id);
    console.log('Status:', entry.status);
    console.log('Created:', entry.created_at);

    // Parsear y mostrar payload
    let payload;
    try {
      payload = JSON.parse(entry.payload);
      console.log('📦 Parsed payload:');
      console.log(JSON.stringify(payload, null, 2));
      
      // Verificar específicamente el meta
      console.log('\n🔍 Meta analysis:');
      console.log('meta exists:', !!payload.meta);
      console.log('meta.conversationId:', payload.meta?.conversationId);
      console.log('meta keys:', payload.meta ? Object.keys(payload.meta) : 'undefined');
      
    } catch (error) {
      console.error('❌ Failed to parse payload:', error);
      console.log('Raw payload:', entry.payload);
    }

  } catch (error) {
    console.error('❌ Error debugging outbox:', error);
    throw error;
  }
}

debugOutboxPayload().catch(console.error);
