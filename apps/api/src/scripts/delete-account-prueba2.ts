import { db, sql } from '@fluxcore/db';

/**
 * Eliminar cuenta prueba2 (ID: e0f9602d-1ca4-417f-a2a2-ab4e257ee53a)
 * y todos sus datos relacionados
 */
async function deleteAccountPrueba2() {
  console.log('🗑️ ELIMINANDO CUENTA prueba2');

  const accountId = 'e0f9602d-1ca4-417f-a2a2-ab4e257ee53a';

  try {
    // 1. Verificar que la cuenta existe
    const account = await db.execute(sql`
      SELECT id, username, display_name FROM accounts 
      WHERE id = ${accountId}
    `);

    if (account.length === 0) {
      console.log('❌ No se encontró la cuenta');
      return;
    }

    console.log('\n📊 CUENTA A ELIMINAR:');
    console.table(account);

    // 2. Eliminar en orden correcto (respetando foreign keys)

    // 2.1. Eliminar mensajes de conversaciones relacionadas
    console.log('\n🗑️ Eliminando mensajes...');
    const deletedMessages = await db.execute(sql`
      DELETE FROM messages 
      WHERE conversation_id IN (
        SELECT id FROM conversations 
        WHERE relationship_id IN (
          SELECT id FROM relationships 
          WHERE account_a_id = ${accountId} OR account_b_id = ${accountId}
        )
      )
    `);

    console.log(`✅ Mensajes eliminados: ${deletedMessages.rowCount || 0}`);

    // 2.2. Eliminar conversaciones
    console.log('\n🗑️ Eliminando conversaciones...');
    const deletedConversations = await db.execute(sql`
      DELETE FROM conversations 
      WHERE relationship_id IN (
        SELECT id FROM relationships 
        WHERE account_a_id = ${accountId} OR account_b_id = ${accountId}
      )
    `);

    console.log(`✅ Conversaciones eliminadas: ${deletedConversations.rowCount || 0}`);

    // 2.3. Eliminar relaciones
    console.log('\n🗑️ Eliminando relaciones...');
    const deletedRelationships = await db.execute(sql`
      DELETE FROM relationships 
      WHERE account_a_id = ${accountId} OR account_b_id = ${accountId}
    `);

    console.log(`✅ Relaciones eliminadas: ${deletedRelationships.rowCount || 0}`);

    // 2.4. Eliminar instalaciones de extensiones
    console.log('\n🗑️ Eliminando instalaciones de extensiones...');
    const deletedExtensions = await db.execute(sql`
      DELETE FROM extension_installations 
      WHERE account_id = ${accountId}
    `);

    console.log(`✅ Extensiones eliminadas: ${deletedExtensions.rowCount || 0}`);

    // 2.5. Eliminar actores
    console.log('\n🗑️ Eliminando actores...');
    const deletedActors = await db.execute(sql`
      DELETE FROM actors 
      WHERE account_id = ${accountId}
    `);

    console.log(`✅ Actores eliminados: ${deletedActors.rowCount || 0}`);

    // 2.6. Eliminar la cuenta
    console.log('\n🗑️ Eliminando cuenta...');
    const deletedAccount = await db.execute(sql`
      DELETE FROM accounts 
      WHERE id = ${accountId}
    `);

    console.log(`✅ Cuenta eliminada: ${deletedAccount.rowCount || 0}`);

    // 3. Verificar que todo fue eliminado
    console.log('\n🔍 Verificando eliminación...');
    
    const remainingAccount = await db.execute(sql`
      SELECT id FROM accounts WHERE id = ${accountId}
    `);

    const remainingRelationships = await db.execute(sql`
      SELECT id FROM relationships 
      WHERE account_a_id = ${accountId} OR account_b_id = ${accountId}
    `);

    const remainingConversations = await db.execute(sql`
      SELECT id FROM conversations 
      WHERE relationship_id IN (
        SELECT id FROM relationships 
        WHERE account_a_id = ${accountId} OR account_b_id = ${accountId}
      )
    `);

    const remainingExtensions = await db.execute(sql`
      SELECT account_id FROM extension_installations 
      WHERE account_id = ${accountId}
    `);

    console.log('\n📊 VERIFICACIÓN FINAL:');
    console.log(`- Cuenta restante: ${remainingAccount.length}`);
    console.log(`- Relaciones restantes: ${remainingRelationships.length}`);
    console.log(`- Conversaciones restantes: ${remainingConversations.length}`);
    console.log(`- Extensiones restantes: ${remainingExtensions.length}`);

    if (remainingAccount.length === 0 && 
        remainingRelationships.length === 0 && 
        remainingConversations.length === 0 && 
        remainingExtensions.length === 0) {
      console.log('\n🎉 ¡CUENTA ELIMINADA COMPLETAMENTE!');
    } else {
      console.log('\n❌ ADVERTENCIA: Quedaron datos residuales');
    }

  } catch (error) {
    console.error('❌ Error eliminando cuenta:', error);
    throw error;
  }
}

deleteAccountPrueba2().catch(console.error);
