import { db, aiTraces } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function main() {
    const convId = process.argv[2] || '1122c837-f43a-4b57-bc58-4e834fcbb89a';
    console.log(`--- TRACES FOR CONVERSATION: ${convId} ---`);
    
    const traces = await db.select().from(aiTraces)
        .where(eq(aiTraces.conversationId, convId))
        .orderBy(desc(aiTraces.createdAt))
        .limit(30);
    
    traces.reverse(); // Chronological
    
    traces.forEach(t => {
        console.log(`\n📍 STEP: ${t.stepName} (${t.status})`);
        if (t.stepName === 'FASE_0_SIEVE') {
            console.log('   Sieve matches:', JSON.stringify(t.output, null, 2));
        }
        if (t.stepName === 'FASE_1_ROUTER') {
            console.log('   Router output:', JSON.stringify(t.output, null, 2));
        }
        if (t.stepName === 'FASE_3_RESOLUTIVE_CALL') {
            console.log('   AI Response Content:', (t.output as any)?.content?.substring(0, 100) + '...');
        }
    });
}

main().catch(console.error);
