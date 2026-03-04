import { db, conversations, conversationParticipants, relationships } from '@fluxcore/db';
import { sql, eq } from 'drizzle-orm';

async function diagnoseParticipants() {
  console.log('🔍 DIAGNÓSTICO DE PARTICIPANTS');
  
  // 1. Conversaciones sin relationship (widget)
  const widgetConvs = await db
    .select({ id: conversations.id, visitorToken: conversations.visitorToken })
    .from(conversations)
    .where(sql`relationship_id IS NULL`);
  
  console.log(`📊 Conversaciones widget (sin relationship): ${widgetConvs.length}`);
  
  // 2. Conversaciones con relationship pero sin participants
  const orphanConvs = await db
    .select({ 
      id: conversations.id, 
      relationshipId: conversations.relationshipId,
      accountAId: relationships.accountAId,
      accountBId: relationships.accountBId 
    })
    .from(conversations)
    .leftJoin(relationships, eq(conversations.relationshipId, relationships.id))
    .where(sql`${conversations.relationshipId} IS NOT NULL AND ${conversations.id} NOT IN (
      SELECT conversation_id FROM conversation_participants
    )`);
  
  console.log(`📊 Conversaciones con relationship pero sin participants: ${orphanConvs.length}`);
  
  // 3. Conversaciones correctas
  const correctConvs = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(sql`${conversations.id} IN (
      SELECT conversation_id FROM conversation_participants
    )`);
  
  console.log(`📊 Conversaciones con participants correctos: ${correctConvs.length}`);
  
  // 4. Detalles de conversaciones huérfanas
  if (orphanConvs.length > 0) {
    console.log('\n🔍 DETALLES DE CONVERSACIONES HUÉRFANAS:');
    orphanConvs.forEach(conv => {
      console.log(`  - ${conv.id} (relationship: ${conv.relationshipId})`);
      console.log(`    accountA: ${conv.accountAId}, accountB: ${conv.accountBId}`);
    });
  }
  
  // 5. Detalles de conversaciones widget
  if (widgetConvs.length > 0) {
    console.log('\n🔍 DETALLES DE CONVERSACIONES WIDGET:');
    widgetConvs.forEach(conv => {
      console.log(`  - ${conv.id} (visitor: ${conv.visitorToken})`);
    });
  }
  
  return { widgetConvs, orphanConvs, correctConvs };
}

diagnoseParticipants().then(console.log).catch(console.error);
