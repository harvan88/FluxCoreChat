
import { db, conversationParticipants } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const convId = 'f0f0c12e-b2e2-4e60-9afc-5bc47fbf127e';
    const participants = await db.select().from(conversationParticipants).where(eq(conversationParticipants.conversationId, convId));
    
    console.log('--- PARTICIPANTS ---');
    console.log(JSON.stringify(participants, null, 2));
}

main().catch(console.error);
