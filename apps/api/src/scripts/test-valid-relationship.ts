import { db, sql } from '@fluxcore/db';

/**
 * Probar con una relación válida
 */
async function testValidRelationship() {
  console.log('🔍 PROBANDO CON RELACIÓN VÁLIDA');

  try {
    const { conversationService } = await import('../services/conversation.service');
    
    // Usar la primera relación válida
    const validRelationshipId = '9bbe4788-5df7-45ab-bacc-2e1c59d9926f';
    
    console.log(`📊 Usando relación válida ${validRelationshipId}`);

    // Probar ensureConversation con relación válida
    try {
      const conversation = await conversationService.ensureConversation({
        relationshipId: validRelationshipId,
        channel: 'web',
      });
      
      console.log('✅ Conversación creada exitosamente:');
      console.log('- ID:', conversation.id);
      console.log('- Relationship ID:', conversation.relationshipId);
      console.log('- Channel:', conversation.channel);
      
      // Verificar que se creó con relación
      if (conversation.relationshipId === validRelationshipId) {
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

testValidRelationship().catch(console.error);
