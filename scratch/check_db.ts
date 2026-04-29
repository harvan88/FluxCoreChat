import { db, relationships, conversations } from '@fluxcore/db';
import { or, eq } from 'drizzle-orm';

async function main() {
    console.log('--- Relationships (where accountId is Dr. Jones) ---');
    const rels1 = await db.select().from(relationships).where(eq(relationships.accountId, '65d340af-97ff-4c9b-85d2-b378badeacf4'));
    console.log(JSON.stringify(rels1, null, 2));

    console.log('\n--- Relationships (where targetAccountId is Dr. Jones) ---');
    const rels2 = await db.select().from(relationships).where(eq(relationships.targetAccountId, '65d340af-97ff-4c9b-85d2-b378badeacf4'));
    console.log(JSON.stringify(rels2, null, 2));
}

main().catch(console.error);
