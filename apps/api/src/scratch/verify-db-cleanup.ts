
import { db, aiTraces } from '@fluxcore/db';
import { count } from 'drizzle-orm';

async function verifyTraces() {
    try {
        const [res] = await db.select({ value: count() }).from(aiTraces);
        console.log(`TOTAL_TRACES_IN_DB: ${res.value}`);
    } catch (err) {
        console.error('Error counting traces:', err);
    }
}

verifyTraces().then(() => process.exit(0));
