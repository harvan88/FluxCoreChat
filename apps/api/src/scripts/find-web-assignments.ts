import { db, sql } from '@fluxcore/db';

async function findWebAssignments() {
  console.log('🔍 BUSCANDO ASIGNACIONES "WEB" EN LA BASE DE DATOS\n');

  try {
    // 1. Buscar cuentas con metadata de web
    console.log('📊 1. CUENTAS CON METADATA WEB:');
    const accounts = await db.execute(sql`
      SELECT id, username, display_name, account_type, profile, created_at
      FROM accounts 
      WHERE profile::text ILIKE '%web%' OR username ILIKE '%web%' OR display_name ILIKE '%web%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(accounts);

    // 2. Buscar conversaciones con channel = 'web'
    console.log('\n📊 2. CONVERSACIONES CON CHANNEL = "WEB":');
    const conversations = await db.execute(sql`
      SELECT id, relationship_id, channel, visitor_token, conversation_type, created_at
      FROM conversations 
      WHERE channel = 'web' OR channel ILIKE '%web%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(conversations);

    // 3. Buscar relaciones que puedan ser de web
    console.log('\n📊 3. RELACIONES (POSIBLES WEB):');
    const relationships = await db.execute(sql`
      SELECT id, account_a_id, account_b_id, relationship_type, created_at
      FROM relationships 
      WHERE relationship_type ILIKE '%web%' OR id IN (
        SELECT relationship_id FROM conversations WHERE channel = 'web'
      )
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(relationships);

    // 4. Buscar usuarios con metadata de web
    console.log('\n📊 4. USUARIOS CON METADATA WEB:');
    try {
      const users = await db.execute(sql`
        SELECT id, metadata, created_at
        FROM users 
        WHERE metadata::text ILIKE '%web%'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.table(users);
    } catch (error) {
      console.log('❌ No se encontró tabla users');
    }

    // 5. Buscar tokens o sesiones web
    console.log('\n📊 5. TABLAS CON TOKENS/SESIONES:');
    const tokenTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name ILIKE '%token%' OR table_name ILIKE '%session%' OR table_name ILIKE '%visitor%')
    `);
    console.table(tokenTables);

    // 6. Buscar en fluxcore_* tablas
    console.log('\n📊 6. FLUXCORE - ACTORS WEB:');
    try {
      const actors = await db.execute(sql`
        SELECT id, external_id, driver_id, namespace, created_at
        FROM fluxcore_actors 
        WHERE namespace = 'web' OR external_id ILIKE '%web%' OR driver_id ILIKE '%web%'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.table(actors);
    } catch (error) {
      console.log('❌ No se encontró tabla fluxcore_actors');
    }

    // 7. Buscar en fluxcore_addresses
    console.log('\n📊 7. FLUXCORE - ADDRESSES WEB:');
    try {
      const addresses = await db.execute(sql`
        SELECT id, driver_id, external_id, namespace, created_at
        FROM fluxcore_addresses 
        WHERE namespace = 'web' OR external_id ILIKE '%web%' OR driver_id ILIKE '%web%'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.table(addresses);
    } catch (error) {
      console.log('❌ No se encontró tabla fluxcore_addresses');
    }

    // 8. Buscar mensajes con metadata de web
    console.log('\n📊 8. MENSAJES CON METADATA WEB:');
    const messages = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, content, type, created_at
      FROM messages 
      WHERE content::text ILIKE '%web%' OR type ILIKE '%web%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(messages);

    // 9. Resumen general
    console.log('\n📊 9. RESUMEN GENERAL:');
    const summary = await db.execute(sql`
      SELECT 
        'accounts' as table_name, COUNT(*) as total, COUNT(CASE WHEN profile::text ILIKE '%web%' THEN 1 END) as web_count
      FROM accounts
      UNION ALL
      SELECT 
        'conversations' as table_name, COUNT(*) as total, COUNT(CASE WHEN channel = 'web' THEN 1 END) as web_count
      FROM conversations
      UNION ALL
      SELECT 
        'relationships' as table_name, COUNT(*) as total, 0 as web_count
      FROM relationships
      UNION ALL
      SELECT 
        'messages' as table_name, COUNT(*) as total, COUNT(CASE WHEN content::text ILIKE '%web%' THEN 1 END) as web_count
      FROM messages
    `);
    console.table(summary);

  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
  }
}

findWebAssignments().catch(console.error);
