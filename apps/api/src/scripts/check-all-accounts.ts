import { db, sql } from '@fluxcore/db';

/**
 * Verificar todas las cuentas para encontrar la nueva
 */
async function checkAllAccounts() {
  console.log('🔍 VERIFICANDO TODAS LAS CUENTAS');

  try {
    // Buscar todas las cuentas personales
    const allAccounts = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE account_type = 'personal'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 ÚLTIMAS 10 CUENTAS PERSONALES:');
    console.table(allAccounts);

    console.log('\n🔍 ANALIZANDO CADA CUENTA:');
    
    for (const account of allAccounts) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📱 CUENTA: ${account.username}`);
      console.log(`📅 Creada: ${account.created_at}`);
      
      // Verificar relación con FluxCore
      const relationship = await db.execute(sql`
        SELECT id, account_a_id, account_b_id, created_at
        FROM relationships 
        WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = ${account.id})
           OR (account_a_id = ${account.id} AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
      `);

      const hasRelation = relationship.length > 0;
      console.log(`🔗 Relación FluxCore: ${hasRelation ? '✅' : '❌'}`);
      
      if (hasRelation) {
        // Verificar conversación
        const conversation = await db.execute(sql`
          SELECT id, relationship_id, channel, created_at
          FROM conversations 
          WHERE relationship_id = ${relationship[0].id}
        `);

        const hasConversation = conversation.length > 0;
        console.log(`💬 Conversación: ${hasConversation ? '✅' : '❌'}`);
        
        if (hasConversation) {
          // Verificar mensajes
          const messages = await db.execute(sql`
            SELECT id, conversation_id, sender_account_id, content, created_at
            FROM messages 
            WHERE conversation_id = ${conversation[0].id}
          `);

          const hasMessages = messages.length > 0;
          console.log(`📝 Mensajes: ${hasMessages ? '✅' : '❌'}`);
          
          if (hasMessages) {
            const fluxcoreMessages = messages.filter(m => m.sender_account_id === '5f96c4c5-473b-4574-93ce-53f54225dd18');
            const hasWelcomeMessage = fluxcoreMessages.length > 0;
            
            console.log(`🤖 Mensaje FluxCore: ${hasWelcomeMessage ? '✅' : '❌'}`);
            
            if (hasWelcomeMessage) {
              try {
                const content = JSON.parse(fluxcoreMessages[0].content);
                console.log(`📄 Mensaje: "${content.text.substring(0, 50)}..."`);
              } catch (e) {
                console.log(`📄 Mensaje: ${fluxcoreMessages[0].content}`);
              }
            }
          }
        }
      }
      
      // Tiempo desde creación
      const now = new Date();
      const created = new Date(account.created_at);
      const hoursAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
      
      console.log(`⏰ Antigüedad: ${hoursAgo} horas`);
      
      if (hoursAgo <= 1) {
        console.log(`🆕 ¡ESTA ES UNA CUENTA RECIENTE!`);
      }
    }

    console.log('\n🎯 CONCLUSIÓN:');
    console.log('Si creaste una cuenta nueva, debería aparecer en esta lista.');
    console.log('Busca la cuenta con el username que usaste al registrarte.');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAllAccounts().catch(console.error);
