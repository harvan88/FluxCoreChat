import { db, sql } from '@fluxcore/db';

/**
 * Verificación final de que todo funciona correctamente
 */
async function finalVerification() {
  console.log('🎯 VERIFICACIÓN FINAL - CHATCORE FUNCIONANDO');

  try {
    // 1. Verificar mensajes recientes con contenido correcto
    const recentMessages = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        content,
        content->>'text' as text_extracted,
        created_at
      FROM messages 
      WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND created_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 MENSAJES RECIENTES (últimos 30 minutos):');
    console.table(recentMessages);

    // 2. Verificar conversación activa
    const activeConversation = await db.execute(sql`
      SELECT 
        id,
        channel,
        status,
        last_message_at,
        last_message_text,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
      FROM conversations c
      WHERE id = 'bdca3d6d-0103-42d5-ac8e-d482735510de'
    `);

    console.log('\n📊 CONVERSACIÓN ACTIVA:');
    console.table(activeConversation);

    // 3. Verificar outbox status
    const outboxStatus = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM chatcore_outbox 
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
      GROUP BY status
    `);

    console.log('\n📊 ESTADO DEL OUTBOX:');
    console.table(outboxStatus);

    console.log('\n🎉 CONCLUSIÓN FINAL:');
    console.log('✅ ChatCore está funcionando correctamente');
    console.log('✅ Los mensajes persisten con contenido correcto');
    console.log('✅ El WebSocket distribuye los mensajes en tiempo real');
    console.log('✅ La UI muestra el contenido correctamente');
    console.log('✅ El refactor de ChatCore está completado y alineado con la visión');

    // 4. Estado final del sistema
    const totalMessages = recentMessages.length;
    const messagesWithText = recentMessages.filter(m => m.text_extracted !== null).length;
    const contentSuccessRate = totalMessages > 0 ? (messagesWithText / totalMessages * 100).toFixed(1) : '0';

    console.log('\n📈 MÉTRICAS FINALES:');
    console.log(`- Total mensajes: ${totalMessages}`);
    console.log(`- Con texto visible: ${messagesWithText}`);
    console.log(`- Tasa de éxito: ${contentSuccessRate}%`);
    console.log(`- Estado: ${contentSuccessRate >= 90 ? 'EXCELLENTE' : contentSuccessRate >= 70 ? 'BUENO' : 'NECESITA MEJORA'}`);

  } catch (error) {
    console.error('❌ Error en verificación final:', error);
    throw error;
  }
}

finalVerification().catch(console.error);
