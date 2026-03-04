import { db, messages, conversations, conversationParticipants } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';

async function diagnoseMessagePerspective() {
  console.log('🔍 DIAGNÓSTICO DE PERSPECTIVA DE MENSAJES');
  
  // 1. Obtener conversación específica
  const conversationId = process.argv[2] || 'ec5b4516-a6f6-40df-9668-b463e321401e';
  
  console.log(`\n📊 Analizando conversación: ${conversationId}`);
  
  // 2. Obtener participantes
  const participants = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  
  console.log(`\n👥 Participantes (${participants.length}):`);
  participants.forEach(p => {
    console.log(`  - ${p.accountId} (role: ${p.role})`);
  });
  
  // 3. Obtener mensajes
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt));
  
  console.log(`\n💬 Mensajes (${msgs.length}):`);
  msgs.forEach(m => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    console.log(`  - ${m.id.slice(0, 8)} | sender: ${m.senderAccountId.slice(0, 8)} | type: ${m.type} | ${content.slice(0, 50)}`);
  });
  
  // 4. Verificar perspectiva desde cada participante
  console.log(`\n🔍 Perspectiva calculada:`);
  participants.forEach(viewer => {
    console.log(`\n  Desde ${viewer.accountId} (role: ${viewer.role}):`);
    msgs.forEach(m => {
      // Lógica CORRECTA basada en role
      let correctType: 'outgoing' | 'incoming';
      
      if (viewer.role === 'initiator') {
        // Si soy iniciador, veo como 'outgoing' los mensajes que YO envío
        correctType = m.senderAccountId === viewer.accountId ? 'outgoing' : 'incoming';
      } else {
        // Si soy recipient, veo como 'outgoing' los mensajes que YO envío
        correctType = m.senderAccountId === viewer.accountId ? 'outgoing' : 'incoming';
      }
      
      const sender = m.senderAccountId.slice(0, 8);
      const viewerShort = viewer.accountId.slice(0, 8);
      console.log(`    ${m.id.slice(0, 8)}: ${sender} → ${viewerShort} | ${correctType}`);
    });
  });
  
  // 5. Detectar inconsistencias
  console.log(`\n⚠️  Inconsistencias detectadas:`);
  let hasIssues = false;
  
  msgs.forEach(m => {
    const senderIsParticipant = participants.some(p => p.accountId === m.senderAccountId);
    if (!senderIsParticipant) {
      console.log(`  ❌ Mensaje ${m.id.slice(0, 8)}: sender ${m.senderAccountId.slice(0, 8)} NO es participante`);
      hasIssues = true;
    }
  });
  
  if (!hasIssues) {
    console.log('  ✅ Todos los senders son participantes válidos');
  }
  
  return { participants, messages: msgs };
}

diagnoseMessagePerspective().then(() => {
  console.log('\n✅ Diagnóstico completado');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
