import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';

const VS_ID = 'b6269a3a-a1f7-4bb2-8bcb-1e91b280321d';

async function test() {
    const r = await db.execute(sql`
        SELECT 
            metadata->>'status' as status_val,
            length(metadata->>'status') as status_len,
            metadata->>'type' as type_val
        FROM fluxcore_document_chunks 
        WHERE vector_store_id = ${VS_ID}::uuid
        LIMIT 1
    `);
    
    console.log("Raw values from DB:");
    console.log(r[0]);
    console.log(`Compare to 'active': ${r[0].status_val === 'active'}`);
    
    process.exit(0);
}

test().catch(console.error);
