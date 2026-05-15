
import { db, aiTraces } from '@fluxcore/db';
import { desc } from 'drizzle-orm';

async function listTraces() {
    const traces = await db.select()
        .from(aiTraces)
        .orderBy(desc(aiTraces.createdAt))
        .limit(30);

    console.log(JSON.stringify(traces.map(t => ({
        id: t.id,
        step: t.step,
        conv: t.conversationId,
        trace: t.traceId,
        created: t.createdAt
    })), null, 2));
}

listTraces().catch(console.error);
