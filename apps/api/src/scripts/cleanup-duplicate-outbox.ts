import { db, sql } from '@fluxcore/db';

/**
 * Limpiar los outbox duplicados antiguos
 */
async function cleanupDuplicateOutbox() {
  console.log('🧹 LIMPIANDO OUTBOX DUPLICADOS ANTIGUOS');

  try {
    // 1. Identificar mensajes con múltiples outbox
    const duplicateMessages = await db.execute(sql`
      SELECT message_id
      FROM chatcore_outbox
      GROUP BY message_id
      HAVING COUNT(*) > 1
    `);

    console.log(`📊 Mensajes con outbox duplicados: ${duplicateMessages.length}`);

    // 2. Para cada mensaje, eliminar el outbox con el accountId incorrecto
    for (const row of duplicateMessages) {
      const messageId = row.message_id;
      
      console.log(`\n🔍 Procesando mensaje: ${messageId}`);
      
      // Obtener todos los outbox para este mensaje
      const outboxes = await db.execute(sql`
        SELECT id, payload::json->>'accountId' as account_id, created_at
        FROM chatcore_outbox
        WHERE message_id = '${messageId}'
        ORDER BY created_at
      `);

      if (outboxes.length === 2) {
        const correctAccountId = 'a9611c11-70f2-46cd-baef-6afcde715f3a';
        const incorrectAccountId = '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31';
        
        // Encontrar y eliminar el outbox con el accountId incorrecto
        for (const outbox of outboxes) {
          if (outbox.account_id === incorrectAccountId) {
            console.log(`- Eliminando outbox #${outbox.id} (accountId incorrecto)`);
            
            await db.execute(sql`
              DELETE FROM chatcore_outbox
              WHERE id = ${outbox.id}
            `);
            
            console.log(`✅ Outbox #${outbox.id} eliminado`);
          } else {
            console.log(`- Manteniendo outbox #${outbox.id} (accountId correcto)`);
          }
        }
      }
    }

    // 3. Verificar el resultado
    console.log('\n📊 VERIFICANDO RESULTADO:');
    const remainingDuplicates = await db.execute(sql`
      SELECT message_id
      FROM chatcore_outbox
      GROUP BY message_id
      HAVING COUNT(*) > 1
    `);

    console.log(`✅ Mensajes con outbox duplicados restantes: ${remainingDuplicates.length}`);

    // 4. Mostrar outbox recientes
    const recentOutbox = await db.execute(sql`
      SELECT 
        id,
        message_id,
        payload::json->>'accountId' as account_id,
        status,
        created_at
      FROM chatcore_outbox
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 OUTBOX RECIENTES:');
    console.table(recentOutbox);

  } catch (error) {
    console.error('❌ Error en limpieza:', error);
    throw error;
  }
}

cleanupDuplicateOutbox().catch(console.error);
