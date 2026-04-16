import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    const vsId = '48bebce0-a795-42df-9dc5-daf060b2d32b';
    const result = await db.execute(sql`
        SELECT content 
        FROM fluxcore_document_chunks 
        WHERE vector_store_id = ${vsId}::uuid
        LIMIT 1
    `);
    
    if (result.length > 0) {
        console.log("FULL CONTENT:");
        console.log(JSON.stringify(result[0].content));
    }
    
    process.exit(0);
}

main().catch(console.error);
