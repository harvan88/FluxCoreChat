import { db, sql } from '@fluxcore/db';

/**
 * Verificar si la extensión está instalada para prueba2
 */
async function checkPrueba2Extension() {
  console.log('🔍 VERIFICANDO EXTENSIÓN PARA CUENTA prueba2');

  try {
    // 1. Obtener ID de la cuenta prueba2
    const account = await db.execute(sql`
      SELECT id, username FROM accounts WHERE username = 'prueba2'
    `);

    if (account.length === 0) {
      console.log('❌ No se encontró cuenta prueba2');
      return;
    }

    const accountId = account[0].id;
    console.log(`📊 Cuenta prueba2 ID: ${accountId}`);

    // 2. Verificar si @fluxcore/asistentes está instalada
    const installation = await db.execute(sql`
      SELECT account_id, extension_id, enabled, updated_at
      FROM extension_installations 
      WHERE account_id = ${accountId}
        AND extension_id = '@fluxcore/asistentes'
    `);

    console.log('\n📊 INSTALACIÓN @fluxcore/asistentes:');
    console.table(installation);

    if (installation.length === 0) {
      console.log('\n❌ PROBLEMA: @fluxcore/asistentes NO está instalada');
      console.log('🔧 El flujo de bienvenida no se ejecuta porque la extensión no está instalada');
      
      // Verificar qué extensiones sí tiene instaladas
      const allInstallations = await db.execute(sql`
        SELECT extension_id, enabled, updated_at
        FROM extension_installations 
        WHERE account_id = ${accountId}
      `);

      console.log('\n📊 EXTENSIONES INSTALADAS:');
      console.table(allInstallations);
      
    } else {
      console.log('\n✅ @fluxcore/asistentes está instalada');
      console.log(`- Enabled: ${installation[0].enabled ? '✅' : '❌'}`);
      
      if (!installation[0].enabled) {
        console.log('❌ PROBLEMA: La extensión está deshabilitada');
      } else {
        console.log('✅ La extensión está habilitada');
        
        // Si está instalada y habilitada, probar el flujo manualmente
        console.log('\n🔍 PROBANDO EL FLUJO MANUALMENTE...');
        
        try {
          const { aiService } = await import('../services/ai.service');
          
          await aiService.tryCreateWelcomeConversation({
            newAccountId: accountId,
            userName: 'prueba2'
          });

          console.log('✅ Flujo ejecutado manualmente');

          // Verificar resultados
          const relationship = await db.execute(sql`
            SELECT id, account_a_id, account_b_id, created_at
            FROM relationships 
            WHERE (account_a_id = '5f96c4c5-473b-4574-93ce-53f54225dd18' AND account_b_id = ${accountId})
               OR (account_a_id = ${accountId} AND account_b_id = '5f96c4c5-473b-4574-93ce-53f54225dd18')
          `);

          console.log('\n📊 RELACIÓN CREADA:');
          console.table(relationship);

          if (relationship.length > 0) {
            const conversation = await db.execute(sql`
              SELECT id, relationship_id, channel, created_at
              FROM conversations 
              WHERE relationship_id = ${relationship[0].id}
            `);

            console.log('\n📊 CONVERSACIÓN CREADA:');
            console.table(conversation);

            if (conversation.length > 0) {
              const messages = await db.execute(sql`
                SELECT id, conversation_id, sender_account_id, content, created_at
                FROM messages 
                WHERE conversation_id = ${conversation[0].id}
              `);

              console.log('\n📊 MENSAJES CREADOS:');
              console.table(messages);

              const fluxcoreMessages = messages.filter(m => m.sender_account_id === '5f96c4c5-473b-4574-93ce-53f54225dd18');
              
              if (fluxcoreMessages.length > 0) {
                console.log('\n🎉 ¡FLUJO CORREGIDO FUNCIONA!');
                try {
                  const content = JSON.parse(fluxcoreMessages[0].content);
                  console.log(`📝 Mensaje: "${content.text}"`);
                } catch (e) {
                  console.log(`📝 Mensaje: ${fluxcoreMessages[0].content}`);
                }
              }
            }
          }

        } catch (error) {
          console.error('❌ Error ejecutando flujo:', error);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkPrueba2Extension().catch(console.error);
