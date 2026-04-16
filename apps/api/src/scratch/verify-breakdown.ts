
import { db, aiTraces } from '@fluxcore/db';
import { count, eq } from 'drizzle-orm';

async function breakdownTraces() {
    try {
        const rows = await db.select({ 
            accountId: aiTraces.accountId, 
            count: count() 
        })
        .from(aiTraces)
        .groupBy(aiTraces.accountId);
        
        console.log('--- TRACES BREAKDOWN BY ACCOUNT ---');
        rows.forEach(r => {
            console.log(`Account: ${r.accountId} | Traces: ${r.count}`);
        });

        if (rows.length === 0) {
            console.log('The table ai_traces is EMPTY.');
        }
    } catch (err) {
        console.error('Error breakdown traces:', err);
    }
}

breakdownTraces().then(() => process.exit(0));
