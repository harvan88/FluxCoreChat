import { db, sql } from '@fluxcore/db';

/**
 * Debug para identificar la fuente del accountId incorrecto
 */
async function debugOutboxSource() {
  console.log('🔍 DEBUG DE LA FUENTE DEL ACCOUNT_ID INCORRECTO');

  try {
    // 1. Verificar los últimos outbox
    const recentOutboxes = await db.execute(sql`
      SELECT id, message_id, status, created_at, payload
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 ÚLTIMOS 5 OUTBOX:');
    console.table(recentOutboxes);

    // 2. Analizar cada payload
    console.log('\n🔍 ANÁLISIS DE PAYLOADS:');
    for (const outbox of recentOutboxes) {
      console.log(`\n📦 Outbox #${outbox.id}:`);
      
      try {
        const payload = JSON.parse(outbox.payload);
        console.log(`- accountId: ${payload.accountId}`);
        console.log(`- userId: ${payload.userId}`);
        console.log(`- messageId: ${payload.messageId}`);
        
        // 3. Verificar el mensaje correspondiente
        if (payload.messageId) {
          const message = await db.execute(sql`
            SELECT id, sender_account_id, created_at, content
            FROM messages
            WHERE id = '${payload.messageId}'
            LIMIT 1
          `);
          
          if (message.length > 0) {
            console.log(`- Mensaje sender_account_id: ${message[0].sender_account_id}`);
            console.log(`- Mensaje created_at: ${message[0].created_at}`);
            
            // 4. Verificar si el accountId del outbox coincide con el del mensaje
            if (payload.accountId === message[0].sender_account_id) {
              console.log(`- ✅ accountId coincide con sender_account_id`);
            } else {
              console.log(`- ❌ accountId NO coincide con sender_account_id`);
              console.log(`  - Outbox accountId: ${payload.accountId}`);
              console.log(`  - Mensaje sender_account_id: ${message[0].sender_account_id}`);
            }
          }
        }
        
      } catch (error) {
        console.log(`❌ Error parsing payload: ${error}`);
      }
    }

    // 5. Verificar si hay algún lugar que esté usando el accountId incorrecto
    console.log('\n🔍 VERIFICANDO SI HAY LUGAR USANDO ACCOUNT_ID INCORRECTO:');
    console.log('Revisa el código para ver si hay algún lugar que esté usando:');
    console.log('- 5c59a05b-4b94-4f78-ab14-9a5fdabe2d31');
    console.log('- targetAccountId');
    console.log('- envelope.targetAccountId');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugOutboxSource().catch(console.error);
