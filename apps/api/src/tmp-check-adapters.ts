import { db } from './core/db';
import { sql } from 'drizzle-orm';

async function checkAdapters() {
    try {
        const result = (await db.execute(sql`
            SELECT adapter_id, signing_secret FROM fluxcore_reality_adapters
        `)) as any;
        console.log('--- REALITY ADAPTERS ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error('Error checking adapters:', e.message);
    }
}

checkAdapters().then(() => process.exit(0));
