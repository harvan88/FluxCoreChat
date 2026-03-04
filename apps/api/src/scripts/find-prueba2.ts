import { db, sql } from '@fluxcore/db';

/**
 * Buscar específicamente la cuenta @prueba2
 */
async function findPrueba2() {
  console.log('🔍 BUSCANDO CUENTA @prueba2');

  try {
    // 1. Buscar exactamente @prueba2
    const exactMatch = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE username = '@prueba2'
    `);

    console.log('\n📊 BÚSQUEDA EXACTA "@prueba2":');
    console.table(exactMatch);

    // 2. Buscar si contiene prueba2
    const containsMatch = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE username ILIKE '%prueba2%'
         OR display_name ILIKE '%prueba2%'
    `);

    console.log('\n📊 BÚSQUEDA QUE CONTIENE "prueba2":');
    console.table(containsMatch);

    if (exactMatch.length > 0) {
      const account = exactMatch[0];
      console.log('\n✅ CUENTA @prueba2 ENCONTRADA');
      console.log(`- ID: ${account.id}`);
      console.log(`- Username: ${account.username}`);
      console.log(`- Display: ${account.display_name}`);
      console.log(`- Creada: ${account.created_at}`);
      
      // Verificar si tiene relación con FluxCore
      const relationship = await db.execute(sql`
        SELECT id, account_a_id, account_b_id, created_at
        FROM relationships 
        WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = ${account.id})
           OR (account_a_id = ${account.id} AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
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
          `);

          console.log('\n📊 MENSAJES:');
          console.table(messages);

          const fluxcoreMessages = messages.filter(m => m.sender_account_id === '5f96c4c5-473b-4574-93ce-53f54225dd18');
          
          console.log(`\n🎯 RESULTADO FINAL:`);
          console.log(`- Cuenta: @prueba2`);
          console.log(`- Relación: ${relationship.length > 0 ? '✅' : '❌'}`);
          console.log(`- Conversación: ${conversation.length > 0 ? '✅' : '❌'}`);
          console.log(`- Mensajes: ${messages.length > 0 ? '✅' : '❌'}`);
          console.log(`- Mensajes FluxCore: ${fluxcoreMessages.length > 0 ? '✅' : '❌'}`);
          
          if (fluxcoreMessages.length > 0) {
            console.log('\n🎉 ¡EL FLUJO DE BIENVENIDA FUNCIONÓ!');
            try {
              const content = JSON.parse(fluxcoreMessages[0].content);
              console.log(`📝 Mensaje: "${content.text}"`);
            } catch (e) {
              console.log(`📝 Mensaje: ${fluxcoreMessages[0].content}`);
            }
          } else {
            console.log('\n❌ EL FLUJO DE BIENVENIDA NO FUNCIONÓ - NECESITA CORRECCIÓN');
          }
        } else {
          console.log('\n❌ NO SE CREÓ CONVERSACIÓN');
        }
      } else {
        console.log('\n❌ NO SE CREÓ RELACIÓN CON FLUXCORE');
      }
    } else {
      console.log('\n❌ CUENTA @prueba2 NO ENCONTRADA');
      
      // 3. Buscar todas las cuentas creadas recientemente
      const recentAccounts = await db.execute(sql`
        SELECT id, username, display_name, account_type, created_at
        FROM accounts 
        WHERE created_at >= NOW() - INTERVAL '10 minutes'
        ORDER BY created_at DESC
      `);

      console.log('\n📊 CUENTAS CREADAS EN ÚLTIMOS 10 MINUTOS:');
      console.table(recentAccounts);

      if (recentAccounts.length === 0) {
        console.log('\n❌ NO HAY CUENTAS RECIENTES');
        console.log('🤔 ¿La cuenta se creó en otra base de datos o servidor?');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

findPrueba2().catch(console.error);
