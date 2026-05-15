
import { db, messages } from '@fluxcore/db';
import { desc } from 'drizzle-orm';

async function main() {
  const latestMessages = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(1);
  
  if (latestMessages.length > 0) {
    const msg = latestMessages[0];
    console.log('--- FINAL PERSISTED MESSAGE ---');
    console.log((msg.content as any)?.text);
    console.log('-------------------------------');
  }
}

main().catch(console.error);
