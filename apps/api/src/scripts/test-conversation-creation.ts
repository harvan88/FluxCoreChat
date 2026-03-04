import { db, sql } from '@fluxcore/db';

/**
 * Probar la creación de conversaciones
 */
async function testConversationCreation() {
  console.log('🔍 PROBANDO CREACIÓN DE CONVERSACIONES');

  try {
    const { conversationService } = await import('../services/conversation.service');
    
    // 1. Obtener una relación real
    const relationship = await db.execute(sql`
      SELECT id FROM relationships 
      WHERE account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      LIMIT 1
    `);

    if (relationship.length === 0) {
      console.log('❌ No hay relaciones para probar');
      return;
    }

    const testRelationshipId = relationship[0].id;
    console.log(`📊 Usando relación ${testRelationshipId}`);

    // 2. Probar ensureConversation con relationshipId válido
    try {
      const conversation = await conversationService.ensureConversation({
        relationshipId: testRelationshipId,
        channel: 'web',
      });
      
      console.log('✅ Conversación creada exitosamente:');
      console.log('- ID:', conversation.id);
      console.log('- Relationship ID:', conversation.relationshipId);
      console.log('- Channel:', conversation.channel);
      
      // Verificar que se creó con relación
      if (conversation.relationshipId === testRelationshipId) {
        console.log('✅ RELACIÓN VINCULADA CORRECTAMENTE');
      } else {
        console.log('❌ RELACIÓN NO VINCULADA');
      }
      
      // Limpiar
      await db.execute(sql`
        DELETE FROM conversations WHERE id = ${conversation.id}
      `);
      console.log('🧹 Conversación de prueba eliminada');
      
    } catch (error) {
      console.error('❌ Error creando conversación:', error);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  }
}

testConversationCreation().catch(console.error);
