import { db, sql } from '@fluxcore/db';

/**
 * Debug de creación de conversaciones
 */
async function debugConversationCreation() {
  console.log('🔍 DEBUG DE CREACIÓN DE CONVERSACIONES');

  try {
    // 1. Verificar el endpoint de creación de conversaciones
    console.log('\n📊 VERIFICANDO ENDPOINT DE CONVERSACIONES...');
    
    // 2. Verificar conversaciones existentes
    const existingConversations = await db.execute(sql`
      SELECT 
        id,
        relationship_id,
        channel,
        status,
        created_at
      FROM conversations 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 CONVERSACIONES RECIENTES (última hora):');
    console.table(existingConversations);

    // 3. Verificar relaciones/contacts disponibles
    const relationships = await db.execute(sql`
      SELECT 
        id,
        account_a_id,
        account_b_id,
        status,
        created_at
      FROM relationships 
      WHERE account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        OR account_b_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 RELACIONES DEL USUARIO:');
    console.table(relationships);

    // 4. Verificar si hay conversaciones sin relación
    const convWithoutRel = await db.execute(sql`
      SELECT 
        id,
        relationship_id,
        channel,
        status,
        created_at
      FROM conversations 
      WHERE relationship_id IS NULL
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 CONVERSACIONES SIN RELACIÓN (últimas 24h):');
    console.table(convWithoutRel);

    // 5. Verificar rutas de conversación en el backend
    console.log('\n🔍 VERIFICANDO RUTAS DE CONVERSACIÓN...');
    const { conversationService } = await import('../services/conversation.service');
    
    // Intentar crear una conversación de prueba
    if (relationships.length > 0) {
      const testRelationship = relationships[0];
      console.log(`\n📊 Intentando crear conversación con relación ${testRelationship.id}...`);
      
      try {
        const newConv = await conversationService.createConversation({
          relationshipId: testRelationship.id,
          channel: 'web',
        });
        
        console.log('✅ Conversación creada exitosamente:');
        console.log('- ID:', newConv.id);
        console.log('- Relationship ID:', newConv.relationshipId);
        console.log('- Channel:', newConv.channel);
        console.log('- Status:', newConv.status);
        
        // Limpiar conversación de prueba
        await db.execute(sql`
          DELETE FROM conversations WHERE id = ${newConv.id}
        `);
        console.log('🧹 Conversación de prueba eliminada');
        
      } catch (createError) {
        console.error('❌ Error creando conversación:', createError);
      }
    } else {
      console.log('❌ No hay relaciones para probar creación');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  }
}

debugConversationCreation().catch(console.error);
