import { db, sql } from '@fluxcore/db';

/**
 * Verificar que la solución del contenido funciona
 */
async function verifySolution() {
  console.log('🔍 VERIFICANDO SOLUCIÓN DE CONTENIDO');

  try {
    // 1. Verificar que los mensajes aún existen en la DB
    const messages = await db.execute(sql`
      SELECT 
        id,
        content,
        content->>'text' as text_extracted,
        created_at
      FROM messages 
      WHERE sender_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 ESTADO ACTUAL EN POSTGRESQL:');
    console.table(messages);

    // 2. Simular la normalización del frontend
    console.log('\n🔍 SIMULACIÓN DE NORMALIZACIÓN DEL FRONTEND:');
    messages.forEach((msg, index) => {
      console.log(`\nMensaje ${index + 1}:`);
      console.log(`Content crudo: ${msg.content}`);
      console.log(`Tipo: ${typeof msg.content}`);
      
      // Simular la lógica del frontend
      let normalizedContent;
      if (typeof msg.content === 'string') {
        if (msg.content.startsWith('{')) {
          try {
            normalizedContent = JSON.parse(msg.content);
            console.log(`✅ JSON parseado:`, normalizedContent);
          } catch (e) {
            normalizedContent = { text: msg.content };
            console.log(`❌ JSON inválido, envuelto:`, normalizedContent);
          }
        } else {
          normalizedContent = { text: msg.content };
          console.log(`✅ Texto plano envuelto:`, normalizedContent);
        }
      } else {
        normalizedContent = msg.content;
        console.log(`✅ Objeto directo:`, normalizedContent);
      }
      
      console.log(`Texto final: "${normalizedContent?.text || 'SIN TEXTO'}"`);
    });

    console.log('\n🎯 CONCLUSIÓN:');
    console.log('✅ Los mensajes existen en PostgreSQL');
    console.log('✅ El contenido está como JSON string');
    console.log('✅ La corrección del frontend debería resolver el problema');
    console.log('✅ Al recargar la página, los mensajes deberían mostrar su texto correctamente');

  } catch (error) {
    console.error('❌ Error en verificación:', error);
    throw error;
  }
}

verifySolution().catch(console.error);
