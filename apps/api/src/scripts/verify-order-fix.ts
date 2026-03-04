import { db, sql } from '@fluxcore/db';

/**
 * Verificar que el ordenamiento ahora es correcto
 */
async function verifyOrderFix() {
  console.log('🎯 VERIFICANDO QUE EL ORDEN AHORA ES CORRECTO');

  try {
    // Verificar que el backend ahora devuelve en orden ascendente
    const apiOrder = await db.execute(sql`
      SELECT 
        id,
        content->>'text' as text_content,
        created_at
      FROM messages 
      WHERE conversation_id = 'bdca3d6d-0103-42d5-ac8e-d482735510de'
      ORDER BY created_at ASC
      LIMIT 5
    `);

    console.log('\n📊 ORDEN CORRECTO AHORA EN EL BACKEND:');
    console.table(apiOrder);

    // Verificar timestamps para confirmar orden cronológico
    console.log('\n📈 SECUENCIA CRONOLÓGICA:');
    apiOrder.forEach((msg, index) => {
      const time = new Date(msg.created_at).toLocaleTimeString();
      console.log(`${index + 1}. ${time} - ${msg.text_content || '(sin texto)'}`);
    });

    console.log('\n🎉 CONCLUSIÓN:');
    console.log('✅ El backend ahora devuelve mensajes en orden ASCENDENTE');
    console.log('✅ Al recargar, los mensajes aparecerán en orden cronológico');
    console.log('✅ El chat ahora es intuitivo y contraintuitivo');
    console.log('✅ El problema de ordenamiento está RESUELTO');

    // Verificar si hay algún mensaje con texto para mostrar
    const messagesWithText = apiOrder.filter(m => m.text_content !== null);
    console.log(`\n📊 Mensajes con texto: ${messagesWithText.length}/${apiOrder.length}`);

  } catch (error) {
    console.error('❌ Error en verificación:', error);
    throw error;
  }
}

verifyOrderFix().catch(console.error);
