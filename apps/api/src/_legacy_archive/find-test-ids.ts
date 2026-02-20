
import { db, conversations, relationships } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const convId = '28a6f187-db8c-4bdb-8405-4db79f0144bf';
    const c = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
    if (c.length > 0) {
        const r = await db.select().from(relationships).where(eq(relationships.id, c[0].relationshipId)).limit(1);
        console.log(JSON.stringify({
            conversationId: c[0].id,
            relationshipId: c[0].relationshipId,
            accountId: r[0].accountId // El "dueño" de la relación
        }));
    } else {
        console.log('not found');
    }
}

main().catch(console.error);
