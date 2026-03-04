import { db, sql } from '@fluxcore/db';

/**
 * Debug específico del problema de contenido null
 */
async function debugContentIssue() {
  console.log('🔍 DEBUG DEL PROBLEMA DE CONTENIDO NULL');

  try {
    // 1. Verificar la estructura exacta del contenido en la DB
    const contentStructure = await db.execute(sql`
      SELECT 
        id,
        content,
        content->>'text' as text_extracted,
        content->'media' as media_extracted,
        jsonb_typeof(content) as content_type,
        created_at
      FROM messages 
      WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 ESTRUCTURA EXACTA DEL CONTENIDO:');
    console.table(contentStructure);

    // 2. Verificar el payload que se está enviando al backend
    const recentOutbox = await db.execute(sql`
      SELECT 
        id,
        message_id,
        payload,
        created_at
      FROM chatcore_outbox 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('\n📊 PAYLOAD EN OUTBOX (última hora):');
    recentOutbox.forEach(entry => {
      console.log(`ID: ${entry.id}`);
      console.log(`Message ID: ${entry.message_id}`);
      console.log(`Payload:`, entry.payload);
      console.log('---');
    });

    // 3. Verificar si hay logs de errores relacionados con el contenido
    console.log('\n🔍 PATRONES DE ERROR A BUSCAR:');
    console.log('- "content" undefined');
    console.log('- "text" undefined');
    console.log('- "payload" malformed');
    console.log('- "JSON" parse error');

    // 4. Verificar el mensaje más reciente en detalle
    const latestMessage = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        sender_account_id,
        content,
        type,
        generated_by,
        status,
        signal_id,
        created_at
      FROM messages 
      WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (latestMessage.length > 0) {
      const msg = latestMessage[0];
      console.log('\n📊 MENSAJE MÁS RECIENTE EN DETALLE:');
      console.log('ID:', msg.id);
      console.log('Content (raw):', JSON.stringify(msg.content));
      console.log('Content type:', typeof msg.content);
      console.log('Has text property:', 'text' in (msg.content || {}));
      console.log('Text value:', msg.content?.text);
      console.log('Created:', msg.created_at);
    }

  } catch (error) {
    console.error('❌ Error en debug de contenido:', error);
    throw error;
  }
}

debugContentIssue().catch(console.error);
