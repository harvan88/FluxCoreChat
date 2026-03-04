import { db, sql } from '@fluxcore/db';

/**
 * Verificar flujo de bienvenida para cuenta prueba2
 */
async function checkPrueba2Welcome() {
  console.log('🔍 VERIFICANDO FLUJO DE BIENVENIDA PARA prueba2');

  try {
    // 1. Obtener la cuenta prueba2
    const account = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE username = 'prueba2'
    `);

    if (account.length === 0) {
      console.log('❌ No se encontró cuenta prueba2');
      return;
    }

    console.log('\n📊 CUENTA prueba2:');
    console.table(account);

    // 2. Verificar relación con FluxCore
    const relationship = await db.execute(sql`
      SELECT id, account_a_id, account_b_id, created_at
      FROM relationships 
      WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = ${account[0].id})
         OR (account_a_id = ${account[0].id} AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
    `);

    console.log('\n📊 RELACIÓN CON FLUXCORE:');
    console.table(relationship);

    if (relationship.length === 0) {
      console.log('❌ NO SE CREÓ RELACIÓN - ESTE ES EL PROBLEMA');
      console.log('🔧 El flujo de bienvenida no se ejecutó');
      return;
    }

    // 3. Verificar conversación
    const conversation = await db.execute(sql`
      SELECT id, relationship_id, channel, created_at
      FROM conversations 
      WHERE relationship_id = ${relationship[0].id}
    `);

    console.log('\n📊 CONVERSACIÓN:');
    console.table(conversation);

    if (conversation.length === 0) {
      console.log('❌ NO SE CREÓ CONVERSACIÓN - ESTE ES EL PROBLEMA');
      console.log('🔧 La relación existe pero no hay conversación');
      return;
    }

    // 4. Verificar mensajes
    const messages = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, content, created_at
      FROM messages 
      WHERE conversation_id = ${conversation[0].id}
      ORDER BY created_at ASC
    `);

    console.log('\n📊 MENSAJES:');
    console.table(messages);

    if (messages.length === 0) {
      console.log('❌ NO SE CREARON MENSAJES - ESTE ES EL PROBLEMA');
      console.log('🔧 Hay conversación pero no hay mensajes');
      return;
    }

    // 5. Verificar mensajes de FluxCore
    const fluxcoreMessages = messages.filter(m => m.sender_account_id === '5f96c4c5-473b-4574-93ce-53f54225dd18');
    
    console.log('\n📊 MENSAJES DE FLUXCORE:');
    console.table(fluxcoreMessages);

    if (fluxcoreMessages.length === 0) {
      console.log('❌ NO HAY MENSAJES DE BIENVENIDA DE FLUXCORE');
      console.log('🔧 Hay mensajes pero no son de FluxCore');
    } else {
      console.log('\n🎉 ¡HAY MENSAJES DE BIENVENIDA DE FLUXCORE!');
      fluxcoreMessages.forEach(msg => {
        try {
          const content = JSON.parse(msg.content);
          console.log(`📝 Mensaje: "${content.text}"`);
        } catch (e) {
          console.log(`📝 Mensaje: ${msg.content}`);
        }
      });
    }

    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log(`- Cuenta: prueba2`);
    console.log(`- Relación: ${relationship.length > 0 ? '✅' : '❌'}`);
    console.log(`- Conversación: ${conversation.length > 0 ? '✅' : '❌'}`);
    console.log(`- Mensajes totales: ${messages.length}`);
    console.log(`- Mensajes FluxCore: ${fluxcoreMessages.length > 0 ? '✅' : '❌'}`);
    
    const flowWorking = relationship.length > 0 && conversation.length > 0 && fluxcoreMessages.length > 0;
    console.log(`- Flujo completo: ${flowWorking ? '✅ FUNCIONÓ' : '❌ NO FUNCIONÓ'}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkPrueba2Welcome().catch(console.error);
