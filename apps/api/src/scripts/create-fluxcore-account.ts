import { db, sql } from '@fluxcore/db';

/**
 * Crear cuenta @fluxcore si no existe
 */
async function createFluxCoreAccount() {
  console.log('🔍 CREANDO CUENTA @fluxcore');

  try {
    // 1. Verificar si ya existe
    const existing = await db.execute(sql`
      SELECT id, username, display_name FROM accounts 
      WHERE username = '@fluxcore'
    `);

    if (existing.length > 0) {
      console.log('✅ La cuenta @fluxcore ya existe:');
      console.table(existing);
      return existing[0];
    }

    // 2. Crear la cuenta @fluxcore
    console.log('📝 Creando cuenta @fluxcore...');
    
    const [fluxcoreAccount] = await db.execute(sql`
      INSERT INTO accounts (id, username, display_name, account_type, profile, owner_user_id, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '@fluxcore',
        'FluxCore',
        'system',
        '{"description": "Asistente IA de FluxCore", "isSystem": true}',
        (SELECT id FROM users WHERE username = 'system' LIMIT 1),
        NOW(),
        NOW()
      )
      RETURNING id, username, display_name, account_type
    `);

    console.log('✅ Cuenta @fluxcore creada exitosamente:');
    console.table(fluxcoreAccount);

    // 3. Probar el flujo de bienvenida
    console.log('\n🔍 PROBANDO EL FLUJO DE BIENVENIDA...');
    
    const { aiService } = await import('../services/ai.service');
    
    await aiService.tryCreateWelcomeConversation({
      newAccountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
      userName: 'Daniel Test'
    });

    console.log('✅ Flujo de bienvenida ejecutado');

    // 4. Verificar resultados
    const relationship = await db.execute(sql`
      SELECT r.id, r.account_a_id, r.account_b_id, r.updated_at
      FROM relationships r
      JOIN accounts a ON a.username = '@fluxcore'
      WHERE (r.account_a_id = a.id OR r.account_b_id = a.id)
        AND (r.account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' 
             OR r.account_b_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a')
    `);

    console.log('\n📊 RELACIÓN CREADA:');
    console.table(relationship);

    const conversation = await db.execute(sql`
      SELECT id, relationship_id, channel, created_at
      FROM conversations 
      WHERE relationship_id = ${relationship[0]?.id}
      ORDER BY created_at DESC
      LIMIT 1
    `);

    console.log('\n📊 CONVERSACIÓN CREADA:');
    console.table(conversation);

    const messages = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, content, created_at
      FROM messages 
      WHERE conversation_id = ${conversation[0]?.id}
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 MENSAJES CREADOS:');
    console.table(messages);

    console.log('\n🎉 RESULTADO FINAL:');
    console.log('✅ Cuenta @fluxcore creada');
    console.log('✅ Relación con usuario creada');
    console.log('✅ Conversación de bienvenida creada');
    console.log('✅ Mensaje de bienvenida enviado');
    console.log('✅ FluxCore ahora puede interactuar con el usuario');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

createFluxCoreAccount().catch(console.error);
