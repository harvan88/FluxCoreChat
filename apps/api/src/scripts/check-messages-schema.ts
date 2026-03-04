import { db, sql } from '@fluxcore/db';

/**
 * Verificar el esquema de la tabla messages
 */
async function checkMessagesSchema() {
  console.log('🔍 VERIFICANDO ESQUEMA DE MESSAGES');

  try {
    // 1. Verificar columnas de la tabla messages
    const schema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESQUEMA DE MESSAGES:');
    console.table(schema);

    // 2. Verificar si hay target_account_id
    const hasTargetAccountId = schema.some(col => col.column_name === 'target_account_id');
    console.log(`\n🔍 ¿Tiene target_account_id? ${hasTargetAccountId ? '✅ SÍ' : '❌ NO'}`);

    // 3. Verificar si hay from_actor_id y to_actor_id
    const hasFromActorId = schema.some(col => col.column_name === 'from_actor_id');
    const hasToActorId = schema.some(col => col.column_name === 'to_actor_id');
    
    console.log(`🔍 ¿Tiene from_actor_id? ${hasFromActorId ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🔍 ¿Tiene to_actor_id? ${hasToActorId ? '✅ SÍ' : '❌ NO'}`);

    // 4. Verificar datos recientes
    const recentMessages = await db.execute(sql`
      SELECT id, sender_account_id, created_at, content
      FROM messages
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('\n📊 MENSAJES RECIENTES:');
    console.table(recentMessages);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkMessagesSchema().catch(console.error);
