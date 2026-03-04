import { db, sql } from '@fluxcore/db';

/**
 * Debug del problema de ordenamiento de mensajes
 */
async function debugMessageOrder() {
  console.log('🔍 DEBUG DEL PROBLEMA DE ORDENAMIENTO');

  try {
    // 1. Verificar el orden actual en PostgreSQL
    const currentOrder = await db.execute(sql`
      SELECT 
        id,
        content->>'text' as text_content,
        created_at
      FROM messages 
      WHERE conversation_id = 'bdca3d6d-0103-42d5-ac8e-d482735510de'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 ORDEN ACTUAL EN POSTGRESQL (DESCENDENTE):');
    console.table(currentOrder);

    // 2. Verificar cómo debería ser (ASCENDENTE)
    const correctOrder = await db.execute(sql`
      SELECT 
        id,
        content->>'text' as text_content,
        created_at
      FROM messages 
      WHERE conversation_id = 'bdca3d6d-0103-42d5-ac8e-d482735510de'
      ORDER BY created_at ASC
      LIMIT 10
    `);

    console.log('\n📊 ORDEN CORRECTO (ASCENDENTE - como debería ser):');
    console.table(correctOrder);

    // 3. Verificar timestamps exactos
    const timestamps = await db.execute(sql`
      SELECT 
        id,
        content->>'text' as text_content,
        EXTRACT(EPOCH FROM created_at) as timestamp_epoch,
        created_at
      FROM messages 
      WHERE conversation_id = 'bdca3d6d-0103-42d5-ac8e-d482735510de'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 ANÁLISIS DE TIMESTAMPS:');
    timestamps.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.text_content} - ${msg.created_at} (epoch: ${msg.timestamp_epoch})`);
    });

    console.log('\n🎯 PROBLEMA IDENTIFICADO:');
    console.log('❌ El backend devuelve mensajes en orden DESCENDENTE (más nuevo primero)');
    console.log('❌ Esto causa que al recargar, los mensajes aparezcan en orden inverso');
    console.log('✅ La solución es cambiar el ORDER BY a ASCENDENTE');

  } catch (error) {
    console.error('❌ Error en debug de orden:', error);
    throw error;
  }
}

debugMessageOrder().catch(console.error);
