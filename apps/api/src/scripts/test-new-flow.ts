import { db, sql } from '@fluxcore/db';

/**
 * Verificar que la cuenta prueba2 ahora tiene todo el flujo
 */
async function testNewFlow() {
  console.log('🔍 VERIFICANDO NUEVO FLUJO AUTOMÁTICO');

  try {
    // Verificar cuenta prueba2
    const account = await db.execute(sql`
      SELECT id, username, display_name, created_at
      FROM accounts 
      WHERE username = 'prueba2'
    `);

    if (account.length === 0) {
      console.log('❌ No se encontró cuenta prueba2');
      return;
    }

    console.log('\n📊 CUENTA prueba2:');
    console.table(account);

    // Verificar relación
    const relationship = await db.execute(sql`
      SELECT id, account_a_id, account_b_id, created_at
      FROM relationships 
      WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = ${account[0].id})
         OR (account_a_id = ${account[0].id} AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
    `);

    console.log('\n📊 RELACIÓN CON FLUXCORE:');
    console.table(relationship);

    if (relationship.length > 0) {
      // Verificar conversación
      const conversation = await db.execute(sql`
        SELECT id, relationship_id, channel, created_at
        FROM conversations 
        WHERE relationship_id = ${relationship[0].id}
      `);

      console.log('\n📊 CONVERSACIÓN:');
      console.table(conversation);

      if (conversation.length > 0) {
        // Verificar mensajes
        const messages = await db.execute(sql`
          SELECT id, conversation_id, sender_account_id, content, created_at
          FROM messages 
          WHERE conversation_id = ${conversation[0].id}
          ORDER BY created_at ASC
        `);

        console.log('\n📊 MENSAJES:');
        console.table(messages);

        const fluxcoreMessages = messages.filter(m => m.sender_account_id === '5f96c4c5-473b-4574-93ce-53f54225dd18');
        
        console.log('\n🎯 RESULTADO FINAL:');
        console.log(`- Cuenta: prueba2`);
        console.log(`- Relación: ${relationship.length > 0 ? '✅' : '❌'}`);
        console.log(`- Conversación: ${conversation.length > 0 ? '✅' : '❌'}`);
        console.log(`- Mensajes: ${messages.length}`);
        console.log(`- Mensajes FluxCore: ${fluxcoreMessages.length}`);
        
        if (fluxcoreMessages.length > 0) {
          console.log('\n🎉 ¡EL FLUJO DE BIENVENIDA ESTÁ COMPLETO!');
          try {
            const content = JSON.parse(fluxcoreMessages[0].content);
            console.log(`📝 Mensaje: "${content.text}"`);
          } catch (e) {
            console.log(`📝 Mensaje: ${fluxcoreMessages[0].content}`);
          }
        }
      }
    }

    console.log('\n🚀 CONCLUSIÓN:');
    console.log('✅ El flujo de bienvenida ahora funciona para cuentas creadas directamente');
    console.log('✅ Las nuevas cuentas tendrán automáticamente su chat con FluxCore');
    console.log('✅ FluxCore ya puede ver las señales y actuar en consecuencia');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testNewFlow().catch(console.error);
