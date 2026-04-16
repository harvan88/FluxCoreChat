import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    const vsId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549';
    const result = await db.execute(sql`
        SELECT id, content, account_id, vector_store_id, embedding IS NULL as "embedIsNull", vector_dims(embedding) as dims
        FROM fluxcore_document_chunks 
        WHERE content ILIKE '%guayaquil%'
    `);
    
    console.log("CHUNK DETAILS:", result);
    process.exit(0);
}

main().catch(console.error);
