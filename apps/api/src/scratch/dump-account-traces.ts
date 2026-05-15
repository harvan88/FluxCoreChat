import { db, aiTraces } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    console.log(`--- LATEST TRACES FOR ACCOUNT: ${accountId} ---`);
    
    const traces = await db.select().from(aiTraces)
        .where(eq(aiTraces.accountId, accountId))
        .orderBy(desc(aiTraces.createdAt))
        .limit(20);
    
    traces.forEach(t => {
        console.log(`\n📍 STEP: ${t.stepName} (${t.status}) - Conv: ${t.conversationId}`);
        if (t.stepName === 'FASE_0_SIEVE') {
            console.log('   Sieve matches:', JSON.stringify(t.output, null, 2));
        }
    });
}

main().catch(console.error);
