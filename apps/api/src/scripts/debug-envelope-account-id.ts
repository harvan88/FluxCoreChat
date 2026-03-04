import { db, sql } from '@fluxcore/db';

/**
 * Debug del accountId en el envelope
 */
async function debugEnvelopeAccountId() {
  console.log('🔍 DEBUG DEL ACCOUNT ID EN ENVELOPE');

  try {
    // 1. Verificar mensajes recientes
    const recentMessages = await db.execute(sql`
      SELECT id, sender_account_id, target_account_id, created_at, content
      FROM messages
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('\n📊 MENSAJES RECIENTES:');
    console.table(recentMessages);

    // 2. Analizar cada mensaje
    console.log('\n🔍 ANÁLISIS DE MENSAJES:');
    for (const message of recentMessages) {
      console.log(`\n📧 Mensaje ${message.id}:`);
      console.log(`- sender_account_id: ${message.sender_account_id}`);
      console.log(`- target_account_id: ${message.target_account_id}`);
      console.log(`- created_at: ${message.created_at}`);
      
      try {
        const content = JSON.parse(message.content);
        console.log(`- content: ${content.text}`);
      } catch (error) {
        console.log(`- content: ${message.content}`);
      }
      
      // 3. Determinar qué accountId se usaría
      const targetAccountId = message.target_account_id;
      const senderAccountId = message.sender_account_id;
      const usedAccountId = targetAccountId || senderAccountId;
      
      console.log(`- targetAccountId: ${targetAccountId}`);
      console.log(`- senderAccountId: ${senderAccountId}`);
      console.log(`- accountId usado: ${usedAccountId}`);
      
      // 4. Verificar si el accountId usado existe
      if (usedAccountId) {
        const account = await db.execute(sql`
          SELECT id, username, account_type
          FROM accounts
          WHERE id = '${usedAccountId}'
          LIMIT 1
        `);
        
        console.log(`- ¿Account existe?`, account.length > 0 ? '✅ SÍ' : '❌ NO');
        if (account.length > 0) {
          console.log(`- Account: ${account[0].username} (${account[0].account_type})`);
        }
      }
    }

    console.log('\n🔍 CONCLUSIÓN:');
    console.log('Revisa el message-core.ts línea 62 para ver si targetAccountId está definido correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugEnvelopeAccountId().catch(console.error);
