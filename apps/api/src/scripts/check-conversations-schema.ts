import { db, sql } from '@fluxcore/db';

/**
 * Verificar schema de conversations
 */
async function checkConversationsSchema() {
  console.log('🔍 VERIFICANDO SCHEMA DE CONVERSATIONS');

  try {
    // 1. Verificar estructura de la tabla
    const tableStructure = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'conversations'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESTRUCTURA DE CONVERSATIONS:');
    console.table(tableStructure);

    // 2. Verificar conversaciones recientes
    const recentConversations = await db.execute(sql`
      SELECT 
        id,
        relationship_id,
        channel,
        created_at
      FROM conversations 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 CONVERSACIONES RECIENTES:');
    console.table(recentConversations);

    // 3. Verificar relaciones
    const relationships = await db.execute(sql`
      SELECT 
        id,
        account_a_id,
        account_b_id,
        created_at
      FROM relationships 
      WHERE account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        OR account_b_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 RELACIONES DEL USUARIO:');
    console.table(relationships);

    // 4. Verificar si hay conversaciones sin relación
    const convWithoutRel = await db.execute(sql`
      SELECT 
        id,
        relationship_id,
        channel,
        created_at
      FROM conversations 
      WHERE relationship_id IS NULL
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 CONVERSACIONES SIN RELACIÓN (últimas 24h):');
    console.table(convWithoutRel);

    console.log('\n🎯 ANÁLISIS:');
    console.log(`- Conversaciones recientes: ${recentConversations.length}`);
    console.log(`- Relaciones del usuario: ${relationships.length}`);
    console.log(`- Conversaciones sin relación: ${convWithoutRel.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkConversationsSchema().catch(console.error);
