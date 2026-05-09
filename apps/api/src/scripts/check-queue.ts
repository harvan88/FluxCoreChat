
import { db, fluxcoreCognitionQueue } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function checkQueue() {
  console.log('--- AUDITORÍA DE COLA DE COGNICIÓN (Conversación 03b4d3e3) ---');
  
  const conversationId = '03b4d3e3-588d-4b21-b62d-17ca21c8e641';
  
  const results = await db
    .select()
    .from(fluxcoreCognitionQueue)
    .where(eq(fluxcoreCognitionQueue.conversationId, conversationId))
    .orderBy(desc(fluxcoreCognitionQueue.id))
    .limit(10);
    
  results.forEach(entry => {
    console.log(`[ID: ${entry.id}] Conv: ${entry.conversationId} | Created: ${entry.createdAt?.toISOString()} | Processed: ${entry.processedAt?.toISOString()} | Signal: ${entry.lastSignalSeq}`);
  });
  
  process.exit(0);
}

checkQueue().catch(err => {
  console.error(err);
  process.exit(1);
});
