
import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function checkMessages() {
  console.log('--- AUDITORÍA DE MENSAJES (Conversación 03b4d3e3) ---');
  
  const conversationId = '03b4d3e3-588d-4b21-b62d-17ca21c8e641';
  
  const results = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(10);
    
  results.forEach(msg => {
    console.log(`[${msg.createdAt.toISOString()}] ID: ${msg.id} | From: ${msg.senderAccountId} | By: ${msg.generatedBy} | Content: ${JSON.stringify(msg.content).slice(0, 50)}...`);
  });
  
  process.exit(0);
}

checkMessages().catch(err => {
  console.error(err);
  process.exit(1);
});
