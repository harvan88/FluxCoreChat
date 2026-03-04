import { db, sql } from '@fluxcore/db';

/**
 * Probar el flujo de bienvenida con la cuenta existente
 */
async function testWelcomeFlow() {
  console.log('🔍 PROBANDO FLUJO DE BIENVENIDA CON CUENTA EXISTENTE');

  try {
    // 1. Verificar que la cuenta fluxcore existe
    const fluxcoreAccount = await db.execute(sql`
      SELECT id, username, display_name, account_type FROM accounts 
      WHERE username = 'fluxcore'
    `);

    console.log('\n📊 CUENTA FLUXCORE:');
    console.table(fluxcoreAccount);

    if (fluxcoreAccount.length === 0) {
      console.log('❌ No existe cuenta fluxcore');
      return;
    }

    // 2. Verificar si el usuario ya tiene relación con fluxcore
    const existingRelationship = await db.execute(sql`
      SELECT id, account_a_id, account_b_id, created_at
      FROM relationships 
      WHERE (account_a_id = ${fluxcoreAccount[0].id} AND account_b_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a')
         OR (account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' AND account_b_id = ${fluxcoreAccount[0].id})
    `);

    console.log('\n📊 RELACIÓN EXISTENTE CON FLUXCORE:');
    console.table(existingRelationship);

    if (existingRelationship.length > 0) {
      console.log('✅ Ya existe relación con FluxCore - el flujo no se ejecuta');
      return;
    }

    // 3. Probar el flujo manualmente
    console.log('\n🔍 EJECUTANDO FLUJO DE BIENVENIDA MANUALMENTE...');
    
    // Crear relación
    const [relationship] = await db.execute(sql`
      INSERT INTO relationships (account_a_id, account_b_id, perspective_a, perspective_b)
      VALUES (
        ${fluxcoreAccount[0].id},
        'a9611c11-70f2-46cd-baef-6afcde715f3a',
        '{"savedName": "Daniel Test"}',
        '{"savedName": "FluxCore"}'
      )
      RETURNING id, account_a_id, account_b_id
    `);

    console.log('✅ Relación creada:');
    console.table(relationship);

    // Crear conversación
    const [conversation] = await db.execute(sql`
      INSERT INTO conversations (relationship_id, channel)
      VALUES (${relationship.id}, 'web')
      RETURNING id, relationship_id, channel, created_at
    `);

    console.log('✅ Conversación creada:');
    console.table(conversation);

    // Crear mensaje de bienvenida
    const [message] = await db.execute(sql`
      INSERT INTO messages (conversation_id, sender_account_id, type, content)
      VALUES (
        ${conversation.id},
        ${fluxcoreAccount[0].id},
        'incoming',
        '{"text": "¡Hola Daniel Test! 👋\\n\\nSoy FluxCore, tu asistente. Estoy aquí para ayudarte a:\\n\\n• Configurar tu perfil\\n• Añadir contactos\\n• Explorar las extensiones\\n\\n¿En qué puedo ayudarte hoy?"}'
      )
      RETURNING id, conversation_id, sender_account_id, content, created_at
    `);

    console.log('✅ Mensaje de bienvenida creado:');
    console.table(message);

    console.log('\n🎉 FLUJO COMPLETADO EXITOSAMENTE:');
    console.log('✅ Cuenta fluxcore encontrada');
    console.log('✅ Relación creada');
    console.log('✅ Conversación creada');
    console.log('✅ Mensaje de bienvenida enviado');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testWelcomeFlow().catch(console.error);
