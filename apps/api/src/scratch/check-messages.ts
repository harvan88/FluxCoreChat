import { db, messages } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const convId = '1122c837-f43a-4b57-bc58-4e834fcbb89a';
    const m = await db.select().from(messages).where(eq(messages.conversationId, convId));
    console.log(`Count for ${convId}: ${m.length}`);
    m.forEach(msg => {
        const content = msg.content as any;
        console.log(`- [${msg.generatedBy}] ${content.text || 'MEDIA'}`);
    });
}

main().catch(console.error);
