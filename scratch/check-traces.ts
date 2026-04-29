import { db, aiTraces } from '@fluxcore/db';
import { desc } from 'drizzle-orm';

async function main() {
    const traces = await db.select().from(aiTraces).orderBy(desc(aiTraces.createdAt)).limit(30);
    console.log(JSON.stringify(traces.map(t => ({
        step: t.stepName,
        execId: t.executionId,
        time: t.createdAt
    })), null, 2));
    process.exit(0);
}

main();
