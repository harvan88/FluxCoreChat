import { db, conversations, conversationParticipants } from '@fluxcore/db';
import { conversationParticipantService } from '../services/conversation-participant.service';
import { sql } from 'drizzle-orm';

async function migrateParticipants() {
  console.log('🔧 MIGRACIÓN DE PARTICIPANTS');
  
  // 1. Procesar conversaciones con relationship pero sin participants
  const orphanConvs = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(sql`${conversations.relationshipId} IS NOT NULL AND ${conversations.id} NOT IN (
      SELECT conversation_id FROM conversation_participants
    )`);
  
  console.log(`📊 Procesando ${orphanConvs.length} conversaciones huérfanas...`);
  
  for (const conv of orphanConvs) {
    try {
      await conversationParticipantService.ensureParticipantsForConversation(conv.id);
      console.log(`✅ Procesada conversación ${conv.id}`);
    } catch (error) {
      console.error(`❌ Error procesando ${conv.id}:`, error);
    }
  }
  
  // 2. Procesar conversaciones widget (visitorToken)
  const widgetConvs = await db
    .select({ id: conversations.id, visitorToken: conversations.visitorToken })
    .from(conversations)
    .where(sql`relationship_id IS NULL AND visitor_token IS NOT NULL`);
  
  console.log(`📊 Procesando ${widgetConvs.length} conversaciones widget...`);
  
  for (const conv of widgetConvs) {
    try {
      await db.insert(conversationParticipants).values({
        conversationId: conv.id,
        accountId: 'visitor', // 🔥 CORREGIDO: 'visitor' placeholder, no null (account_id NOT NULL)
        role: 'observer', // ✅ 'observer' está en CHECK constraint
        identityType: 'anonymous',
        visitorToken: conv.visitorToken,
      });
      console.log(`✅ Procesada conversación widget ${conv.id}`);
    } catch (error) {
      console.error(`❌ Error procesando widget ${conv.id}:`, error);
    }
  }
  
  // 3. Verificación final
  const finalCount = await db.select().from(conversationParticipants);
  console.log(`🎉 Participants finales: ${finalCount.length}`);
  
  // 4. Verificación por tipo
  const withRelationship = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(sql`${conversations.id} IN (
      SELECT conversation_id FROM conversation_participants
    )`);
  
  console.log(`📊 Conversaciones con participants después de migración: ${withRelationship.length}`);
  
  return { finalCount: finalCount.length, withRelationship: withRelationship.length };
}

migrateParticipants().then(console.log).catch(console.error);
