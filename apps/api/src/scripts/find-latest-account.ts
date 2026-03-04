import { db, sql } from '@fluxcore/db';

/**
 * Encontrar la cuenta más nueva creada
 */
async function findLatestAccount() {
  console.log('🔍 BUSCANDO CUENTA MÁS NUEVA');

  try {
    // Buscar la cuenta creada en los últimos 5 minutos
    const recentAccount = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
        AND account_type = 'personal'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    console.log('\n📊 CUENTA CREADA EN ÚLTIMOS 5 MINUTOS:');
    console.table(recentAccount);

    if (recentAccount.length === 0) {
      console.log('❌ No hay cuentas creadas en los últimos 5 minutos');
      
      // Buscar en última hora
      const hourAccount = await db.execute(sql`
        SELECT id, username, display_name, account_type, created_at
        FROM accounts 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
          AND account_type = 'personal'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      console.log('\n📊 CUENTA MÁS RECIENTE (última hora):');
      console.table(hourAccount);
      
      if (hourAccount.length > 0) {
        console.log(`\n🔍 Analizando cuenta: ${hourAccount[0].username}`);
        
        // Verificar si tiene relación con FluxCore
        const relationship = await db.execute(sql`
          SELECT id, account_a_id, account_b_id, created_at
          FROM relationships 
          WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = ${hourAccount[0].id})
             OR (account_a_id = ${hourAccount[0].id} AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
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
            
            console.log(`\n📊 RESULTADO FINAL:`);
            console.log(`- Cuenta: ${hourAccount[0].username}`);
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
              console.log('\n❌ EL FLUJO DE BIENVENIDA NO FUNCIONÓ');
            }
          } else {
            console.log('\n❌ NO SE CREÓ CONVERSACIÓN');
          }
        } else {
          console.log('\n❌ NO SE CREÓ RELACIÓN');
        }
      }
    } else {
      console.log('\n✅ CUENTA ENCONTRADA - ANALIZANDO...');
      
      // Analizar esta cuenta
      const relationship = await db.execute(sql`
        SELECT id, account_a_id, account_b_id, created_at
        FROM relationships 
        WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = ${recentAccount[0].id})
           OR (account_a_id = ${recentAccount[0].id} AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
      `);

      console.log('\n📊 RELACIÓN CON FLUXCORE:');
      console.table(relationship);

      if (relationship.length > 0) {
        const conversation = await db.execute(sql`
          SELECT id, relationship_id, channel, created_at
          FROM conversations 
          WHERE relationship_id = ${relationship[0].id}
        `);

        console.log('\n📊 CONVERSACIÓN:');
        console.table(conversation);

        if (conversation.length > 0) {
          const messages = await db.execute(sql`
            SELECT id, conversation_id, sender_account_id, content, created_at
            FROM messages 
            WHERE conversation_id = ${conversation[0].id}
          `);

          console.log('\n📊 MENSAJES:');
          console.table(messages);

          const fluxcoreMessages = messages.filter(m => m.sender_account_id === '5f96c4c5-473b-4574-93ce-53f54225dd18');
          
          console.log(`\n🎉 RESULTADO:`);
          console.log(`- Cuenta nueva: ${recentAccount[0].username}`);
          console.log(`- Flujo bienvenida: ${fluxcoreMessages.length > 0 ? '✅ FUNCIONÓ' : '❌ NO FUNCIONÓ'}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

findLatestAccount().catch(console.error);
