import { db, sql } from '@fluxcore/db';

/**
 * Debug específico para mensajes del usuario actual
 */
async function debugUserMessages() {
  console.log('🔍 DEBUG DE MENSAJES DEL USUARIO');

  try {
    // 1. Mensajes del usuario actual (a9611c11-70f2-46cd-baef-6afcde715f3a)
    const userMessages = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        sender_account_id,
        content->>'text' as text_content,
        type,
        generated_by,
        status,
        signal_id,
        created_at
      FROM messages 
      WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND created_at >= NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log('\n📊 MENSAJES DEL USUARIO (últimas 2 horas):');
    console.table(userMessages);

    // 2. Conversaciones del usuario
    const userConversations = await db.execute(sql`
      SELECT 
        c.id,
        c.channel,
        c.status,
        c.last_message_at,
        c.last_message_text,
        COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.id IN (
        SELECT DISTINCT conversation_id 
        FROM messages 
        WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      )
      GROUP BY c.id, c.channel, c.status, c.last_message_at, c.last_message_text
      ORDER BY c.last_message_at DESC
    `);

    console.log('\n📊 CONVERSACIONES DEL USUARIO:');
    console.table(userConversations);

    // 3. Mensajes específicos de la conversación 744c4c32-10fd-4275-bcdd-8eff9f2785a8
    const specificConversation = await db.execute(sql`
      SELECT 
        id,
        sender_account_id,
        content->>'text' as text_content,
        type,
        generated_by,
        status,
        signal_id,
        created_at
      FROM messages 
      WHERE conversation_id = '744c4c32-10fd-4275-bcdd-8eff9f2785a8'
        AND created_at >= NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 MENSAJES DE LA CONVERSACIÓN 744c4c32 (últimas 2 horas):');
    console.table(specificConversation);

    // 4. Verificar si hay mensajes con contenido de prueba
    const testMessages = await db.execute(sql`
      SELECT 
        id,
        content->>'text' as text_content,
        created_at,
        signal_id
      FROM messages 
      WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND (
          content->>'text' ILIKE '%prueba%'
          OR content->>'text' ILIKE '%test%'
          OR content->>'text' ILIKE '%Hola%'
          OR content->>'text' ILIKE '%mensaje%'
        )
        AND created_at >= NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 BÚSQUEDA DE MENSAJES CON PALABRAS CLAVE:');
    console.table(testMessages);

    // 5. Verificar el estado exacto de los mensajes más recientes
    const recentStatus = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count,
        MAX(created_at) as last_created
      FROM messages 
      WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND created_at >= NOW() - INTERVAL '2 hours'
      GROUP BY status
      ORDER BY last_created DESC
    `);

    console.log('\n📊 ESTADO DE LOS MENSAJES RECIENTES:');
    console.table(recentStatus);

  } catch (error) {
    console.error('❌ Error en debug:', error);
    throw error;
  }
}

debugUserMessages().catch(console.error);
