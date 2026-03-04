import { db, sql } from '@fluxcore/db';

/**
 * Debug del error 500 al cargar mensajes
 */
async function debug500Error() {
  console.log('🔍 DEBUG DEL ERROR 500');

  try {
    // 1. Verificar si la consulta SQL directa funciona
    console.log('\n📊 Probando consulta SQL directa...');
    const directQuery = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        content,
        created_at
      FROM messages 
      WHERE conversation_id = 'bdca3d6d-0103-42d5-ac8e-d482735510de'
      ORDER BY created_at ASC
      LIMIT 5
    `);

    console.log('✅ Consulta directa funciona:');
    console.table(directQuery);

    // 2. Verificar si el problema está en el ORM (Drizzle)
    console.log('\n📊 Probando consulta con Drizzle ORM...');
    const { messageService } = await import('../services/message.service');
    
    try {
      const drizzleQuery = await messageService.getMessagesByConversationId(
        'bdca3d6d-0103-42d5-ac8e-d482735510de', 
        50, 
        0
      );
      console.log('✅ Drizzle ORM funciona:');
      console.log(`Mensajes encontrados: ${drizzleQuery.length}`);
      if (drizzleQuery.length > 0) {
        console.log('Primer mensaje:', drizzleQuery[0]);
      }
    } catch (drizzleError) {
      console.error('❌ Error en Drizzle ORM:', drizzleError);
      console.error('Stack:', drizzleError.stack);
    }

    // 3. Verificar si el problema está en la importación de asc()
    console.log('\n📊 Verificando importación de asc()...');
    const { asc } = await import('drizzle-orm');
    console.log('✅ asc() importado correctamente:', typeof asc);

  } catch (error) {
    console.error('❌ Error general:', error);
    console.error('Stack:', error.stack);
  }
}

debug500Error().catch(console.error);
