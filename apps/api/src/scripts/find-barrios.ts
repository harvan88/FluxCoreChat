import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("=== BUSCANDO CUALQUIER BARRIO EN DB ===");
    const result = await db.execute(sql`
        SELECT content, vector_store_id, account_id 
        FROM fluxcore_document_chunks 
        WHERE content ILIKE '%barrio%' 
        LIMIT 10
    `);
    
    console.log(`Encontrados: ${result.length}`);
    for (const r of result) {
        console.log(`- VS: ${r.vector_store_id} | Content: ${r.content.substring(0, 50)}...`);
    }
    
    process.exit(0);
}

main().catch(console.error);
