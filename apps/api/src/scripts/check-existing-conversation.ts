import { db, sql } from '@fluxcore/db';

/**
 * Verificar si ya existe conversación y mensaje de bienvenida
 */
async function checkExistingConversation() {
  console.log('🔍 VERIFICANDO CONVERSACIÓN Y MENSAJE EXISTENTES');

  try {
    // 1. Obtener la relación existente
    const relationship = await db.execute(sql`
      SELECT id, account_a_id, account_b_id, created_at
      FROM relationships 
      WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a')
         OR (account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
    `);

    console.log('\n📊 RELACIÓN EXISTENTE:');
    console.table(relationship);

    if (relationship.length === 0) {
      console.log('❌ No hay relación');
      return;
    }

    // 2. Verificar conversaciones para esa relación
    const conversations = await db.execute(sql`
      SELECT id, relationship_id, channel, created_at
      FROM conversations 
      WHERE relationship_id = ${relationship[0].id}
      ORDER BY created_at DESC
    `);

    console.log('\n📊 CONVERSACIONES DE LA RELACIÓN:');
    console.table(conversations);

    if (conversations.length === 0) {
      console.log('❌ No hay conversaciones - ESTE ES EL PROBLEMA');
      return;
    }

    // 3. Verificar mensajes en la primera conversación
    const messages = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, content, created_at
      FROM messages 
      WHERE conversation_id = ${conversations[0].id}
      ORDER BY created_at ASC
    `);

    console.log('\n📊 MENSAJES EN LA CONVERSACIÓN:');
    console.table(messages);

    if (messages.length === 0) {
      console.log('❌ No hay mensajes - ESTE ES EL PROBLEMA');
      return;
    }

    // 4. Verificar si alguno de los mensajes es de FluxCore
    const fluxcoreMessages = messages.filter(m => m.sender_account_id === '5f96c4c5-473b-4574-93ce-53f54225dd18');
    
    console.log('\n📊 MENSAJES DE FLUXCORE:');
    console.table(fluxcoreMessages);

    if (fluxcoreMessages.length === 0) {
      console.log('❌ No hay mensajes de bienvenida de FluxCore - ESTE ES EL PROBLEMA');
    } else {
      console.log('✅ Hay mensajes de FluxCore');
      fluxcoreMessages.forEach(msg => {
        console.log(`- Mensaje: ${JSON.parse(msg.content).text}`);
      });
    }

    // 5. Verificar si el usuario puede ver esta conversación
    console.log('\n🔍 VERIFICANDO VISIBILIDAD:');
    console.log(`- Relación ID: ${relationship[0].id}`);
    console.log(`- Conversación ID: ${conversations[0].id}`);
    console.log(`- Mensajes totales: ${messages.length}`);
    console.log(`- Mensajes de FluxCore: ${fluxcoreMessages.length}`);

    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    if (relationship.length > 0 && conversations.length > 0 && fluxcoreMessages.length > 0) {
      console.log('✅ El flujo de bienvenida ya se ejecutó anteriormente');
      console.log('✅ Todo está funcionando correctamente');
    } else {
      console.log('❌ Falta algo en el flujo de bienvenida');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkExistingConversation().catch(console.error);
