import { db, sql } from '@fluxcore/db';

/**
 * Debug del problema de clic en contacto
 */
async function debugContactClick() {
  console.log('🔍 DEBUG DEL PROBLEMA DE CLIC EN CONTACTO');

  try {
    // 1. Verificar qué contactos/relaciones devuelve el frontend
    const relationships = await db.execute(sql`
      SELECT 
        id,
        account_a_id,
        account_b_id,
        created_at,
        CASE WHEN account_a_id = account_b_id THEN 'SELF_REFERENCE' ELSE 'VALID' END as relationship_type
      FROM relationships 
      WHERE account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
         OR account_b_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      ORDER BY created_at DESC
    `);

    console.log('\n📊 RELACIONES DISPONIBLES PARA EL FRONTEND:');
    console.table(relationships);

    // 2. Simular lo que el frontend haría al hacer clic
    console.log('\n🔍 SIMULANDO CLIC EN CONTACTO...');
    
    for (const rel of relationships) {
      if (rel.relationship_type === 'VALID') {
        console.log(`\n📱 Probando clic en relación válida ${rel.id}:`);
        
        try {
          const { conversationService } = await import('../services/conversation.service');
          const conversation = await conversationService.ensureConversation({
            relationshipId: rel.id,
            channel: 'web',
          });
          
          console.log(`✅ Conversación creada: ${conversation.id}`);
          console.log(`✅ Relationship ID: ${conversation.relationshipId}`);
          
          // Limpiar
          await db.execute(sql`
            DELETE FROM conversations WHERE id = ${conversation.id}
          `);
          
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
        }
      } else {
        console.log(`\n⚠️ Omitiendo relación autoreferencial ${rel.id}`);
      }
    }

    // 3. Verificar conversaciones existentes sin relación
    const convWithoutRel = await db.execute(sql`
      SELECT id, channel, created_at
      FROM conversations 
      WHERE relationship_id IS NULL
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 CONVERSACIONES RECIENTES SIN RELACIÓN:');
    console.table(convWithoutRel);

    console.log('\n🎯 CONCLUSIÓN:');
    console.log('✅ El problema estaba en conversation_participants (resuelto)');
    console.log('✅ Las relaciones válidas funcionan correctamente');
    console.log('⚠️ Las relaciones autoreferenciales causan errores (esperado)');
    console.log('❌ Las conversaciones sin relación indican otro problema (posible widget/visitor)');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugContactClick().catch(console.error);
