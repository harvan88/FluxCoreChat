import { db, sql } from '@fluxcore/db';

/**
 * Verificar si se creó conversación para cuenta nueva
 */
async function checkNewAccount() {
  console.log('🔍 VERIFICANDO CUENTA NUEVA');

  try {
    // 1. Buscar la cuenta más reciente
    const newestAccount = await db.execute(sql`
      SELECT id, username, display_name, created_at
      FROM accounts 
      WHERE account_type = 'personal'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 CUENTAS MÁS RECIENTES:');
    console.table(newestAccount);

    // 2. Para cada cuenta reciente, verificar relación con fluxcore
    for (const account of newestAccount) {
      console.log(`\n🔍 Verificando cuenta: ${account.username} (${account.id})`);
      
      // Buscar relación con fluxcore
      const relationship = await db.execute(sql`
        SELECT id, account_a_id, account_b_id, created_at
        FROM relationships 
        WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = ${account.id})
           OR (account_a_id = ${account.id} AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
      `);

      console.log(`📊 Relación con FluxCore: ${relationship.length > 0 ? '✅ SÍ' : '❌ NO'}`);
      if (relationship.length > 0) {
        console.table(relationship);

        // Verificar conversación
        const conversation = await db.execute(sql`
          SELECT id, relationship_id, channel, created_at
          FROM conversations 
          WHERE relationship_id = ${relationship[0].id}
        `);

        console.log(`📊 Conversación: ${conversation.length > 0 ? '✅ SÍ' : '❌ NO'}`);
        if (conversation.length > 0) {
          console.table(conversation);

          // Verificar mensajes
          const messages = await db.execute(sql`
            SELECT id, conversation_id, sender_account_id, content, created_at
            FROM messages 
            WHERE conversation_id = ${conversation[0].id}
          `);

          console.log(`📊 Mensajes: ${messages.length > 0 ? '✅ SÍ' : '❌ NO'}`);
          if (messages.length > 0) {
            console.table(messages);
            
            const fluxcoreMessages = messages.filter(m => m.sender_account_id === '5f96c4c5-473b-4574-93ce-53f54225dd18');
            console.log(`📊 Mensajes de FluxCore: ${fluxcoreMessages.length > 0 ? '✅ SÍ' : '❌ NO'}`);
            
            if (fluxcoreMessages.length > 0) {
              fluxcoreMessages.forEach(msg => {
                try {
                  const content = JSON.parse(msg.content);
                  console.log(`📝 Mensaje de bienvenida: "${content.text}"`);
                } catch (e) {
                  console.log(`📝 Mensaje de bienvenida: ${msg.content}`);
                }
              });
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkNewAccount().catch(console.error);
