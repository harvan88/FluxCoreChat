import { db, sql } from '@fluxcore/db';

/**
 * Debug del accountId en outbox
 */
async function debugOutboxAccountId() {
  console.log('🔍 DEBUG DEL ACCOUNT ID EN OUTBOX');

  try {
    // 1. Verificar outbox entries recientes
    const recentOutbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, payload
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('\n📊 OUTBOX RECIENTES:');
    console.table(recentOutbox);

    // 2. Analizar payload de cada outbox
    console.log('\n🔍 ANÁLISIS DE PAYLOAD:');
    for (const entry of recentOutbox) {
      console.log(`\n📦 Outbox #${entry.id}:`);
      console.log(`- Message ID: ${entry.message_id}`);
      console.log(`- Status: ${entry.status}`);
      
      try {
        const payload = JSON.parse(entry.payload);
        console.log('- accountId:', payload.accountId);
        console.log('- userId:', payload.userId);
        
        if (payload.meta) {
          console.log('- meta.messageId:', payload.meta.messageId);
          console.log('- meta.conversationId:', payload.meta.conversationId);
          console.log('- meta.humanSenderId:', payload.meta.humanSenderId);
        }
        
        // 3. Verificar si el accountId existe en accounts
        if (payload.accountId) {
          const account = await db.execute(sql`
            SELECT id, username, account_type
            FROM accounts
            WHERE id = '${payload.accountId}'
            LIMIT 1
          `);
          
          console.log('- ¿Account existe?', account.length > 0 ? '✅ SÍ' : '❌ NO');
          if (account.length > 0) {
            console.log('- Account:', account[0]);
          }
        }
        
      } catch (error) {
        console.log('❌ Error parsing payload:', error);
        console.log('Raw payload:', entry.payload);
      }
    }

    // 4. Verificar qué accountId se está usando en message-core
    console.log('\n🔍 VERIFICANDO MESSAGE-CORE:');
    console.log('Revisa el message-core.ts para ver qué accountId se está pasando al outbox');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugOutboxAccountId().catch(console.error);
