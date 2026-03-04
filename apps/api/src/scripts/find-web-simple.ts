import { db, sql } from '@fluxcore/db';

async function findWebAssignments() {
  console.log('🔍 BUSCANDO ASIGNACIONES "WEB" EN LA BASE DE DATOS\n');

  try {
    // 1. Conversaciones web (las más importantes)
    console.log('📊 1. CONVERSACIONES WEB DETALLADAS:');
    const conversations = await db.execute(sql`
      SELECT 
        c.id,
        c.channel,
        c.visitor_token,
        c.conversation_type,
        c.created_at,
        r.account_a_id,
        r.account_b_id,
        a1.username as account_a_name,
        a2.username as account_b_name
      FROM conversations c
      LEFT JOIN relationships r ON c.relationship_id = r.id
      LEFT JOIN accounts a1 ON r.account_a_id = a1.id
      LEFT JOIN accounts a2 ON r.account_b_id = a2.id
      WHERE c.channel = 'web'
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    console.table(conversations);

    // 2. Buscar las cuentas asociadas a estas conversaciones
    console.log('\n📊 2. CUENTAS ASOCIADAS A CONVERSACIONES WEB:');
    const webAccounts = await db.execute(sql`
      SELECT DISTINCT
        a.id,
        a.username,
        a.display_name,
        a.account_type,
        a.created_at
      FROM accounts a
      WHERE a.id IN (
        SELECT DISTINCT r.account_a_id 
        FROM conversations c 
        JOIN relationships r ON c.relationship_id = r.id 
        WHERE c.channel = 'web'
        UNION
        SELECT DISTINCT r.account_b_id 
        FROM conversations c 
        JOIN relationships r ON c.relationship_id = r.id 
        WHERE c.channel = 'web'
      )
      ORDER BY a.created_at DESC
    `);
    console.table(webAccounts);

    // 3. Mensajes en conversaciones web
    console.log('\n📊 3. MENSAJES EN CONVERSACIONES WEB:');
    const messages = await db.execute(sql`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_account_id,
        m.type,
        m.generated_by,
        m.status,
        m.created_at,
        a.username as sender_name
      FROM messages m
      LEFT JOIN accounts a ON m.sender_account_id = a.id
      WHERE m.conversation_id IN (
        SELECT id FROM conversations WHERE channel = 'web'
      )
      ORDER BY m.created_at DESC
      LIMIT 10
    `);
    console.table(messages);

    // 4. FluxCore actors para web
    console.log('\n📊 4. FLUXCORE ACTORS WEB:');
    try {
      const actors = await db.execute(sql`
        SELECT id, external_id, driver_id, namespace, created_at
        FROM fluxcore_actors 
        WHERE namespace = 'web' OR external_id ILIKE '%web%'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.table(actors);
    } catch (error) {
      console.log('❌ No se encontró fluxcore_actors');
    }

    // 5. Resumen
    console.log('\n📊 5. RESUMEN WEB:');
    const summary = await db.execute(sql`
      SELECT 
        'conversations_web' as item, COUNT(*) as count
      FROM conversations WHERE channel = 'web'
      UNION ALL
      SELECT 
        'conversations_visitor' as item, COUNT(*) as count
      FROM conversations WHERE channel = 'web' AND visitor_token IS NOT NULL
      UNION ALL
      SELECT 
        'conversations_registered' as item, COUNT(*) as count
      FROM conversations WHERE channel = 'web' AND visitor_token IS NULL
      UNION ALL
      SELECT 
        'unique_accounts' as item, COUNT(DISTINCT account_a_id) as count
      FROM conversations c
      JOIN relationships r ON c.relationship_id = r.id 
      WHERE c.channel = 'web'
    `);
    console.table(summary);

  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
  }
}

findWebAssignments().catch(console.error);
