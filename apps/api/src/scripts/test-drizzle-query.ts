import { db, fluxcoreAssistants } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function testQuery() {
    try {
        console.log('Testing query on fluxcore_assistants...');
        const results = await db.select().from(fluxcoreAssistants).limit(1);
        console.log('Results found:', results.length);
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    }
    process.exit(0);
}

testQuery();
