import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    const vsId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549';
    const result = await db.execute(sql`
        SELECT account_id, count(*) 
        FROM fluxcore_document_chunks 
        WHERE vector_store_id = ${vsId}::uuid
        GROUP BY account_id
    `);
    console.log(`Account owner(s) for VS ${vsId}:`, result);
    process.exit(0);
}
main().catch(console.error);
