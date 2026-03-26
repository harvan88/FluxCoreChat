import { db } from '@fluxcore/db';
import { conversationParticipants, messages, actors } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function checkActorSubscription() {
  const conversationId = 'b4b58580-b589-4cc4-a1db-7e4122140a25'; // Reemplazar con el ID real
  
  console.log('=== VERIFICANDO SUSCRIPCIÓN DE ACTORES ===');
  
  // 1. Verificar participantes suscritos
  const participants = await db
    .select({
      id: conversationParticipants.id,
      conversationId: conversationParticipants.conversationId,
      accountId: conversationParticipants.accountId,
      actorId: conversationParticipants.actorId,
      role: conversationParticipants.role,
      identityType: conversationParticipants.identityType,
      subscribedAt: conversationParticipants.subscribedAt,
      unsubscribedAt: conversationParticipants.unsubscribedAt,
      actorType: actors.actorType,
      externalKey: actors.externalKey,
    })
    .from(conversationParticipants)
    .leftJoin(actors, eq(conversationParticipants.actorId, actors.id))
    .where(eq(conversationParticipants.conversationId, conversationId))
    .orderBy(desc(conversationParticipants.subscribedAt));
  
  console.log('\n--- PARTICIPANTES SUSCRITOS ---');
  console.log(participants);
  
  // 2. Verificar mensajes recientes
  const recentMessages = await db
    .select({
      id: messages.id,
      senderAccountId: messages.senderAccountId,
      fromActorId: messages.fromActorId,
      messageText: messages.content,
      createdAt: messages.createdAt,
      generatedBy: messages.generatedBy,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(5);
  
  console.log('\n--- MENSAJES RECIENTES ---');
  recentMessages.forEach(msg => {
    console.log({
      id: msg.id,
      sender: msg.senderAccountId,
      actor: msg.fromActorId,
      text: msg.messageText?.text || '(sin texto)',
      generatedBy: msg.generatedBy,
      createdAt: msg.createdAt,
    });
  });
  
  // 3. Verificar quién está desuscrito
  const unsubscribed = participants.filter(p => p.unsubscribedAt !== null);
  if (unsubscribed.length > 0) {
    console.log('\n--- ACTORES DESUSCRITOS ---');
    console.log(unsubscribed);
  } else {
    console.log('\n✅ Todos los participantes están suscritos');
  }
}

checkActorSubscription().catch(console.error);
