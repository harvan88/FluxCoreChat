import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("=== BUSCANDO BARRIO ALTO PALERMO EN DB ===");
    
    // Buscar cualquier chunk que contenga "alto palermo"
    const result = await db.execute(sql`
        SELECT 
            c.id, 
            c.chunk_index as idx, 
            c.token_count as tokens,
            c.content 
        FROM fluxcore_document_chunks c
        WHERE c.content ILIKE '%alto palermo%'
        LIMIT 5
    `);
    
    console.log(`Encontrados ${result.length} chunks con la palabra 'alto palermo'.\n`);
    
    for (let i = 0; i < result.length; i++) {
        console.log(`\n--- CHUNK IDX: ${result[i].idx} | TOKENS: ${result[i].tokens} ---`);
        console.log(result[i].content);
        console.log("-----------------------------------------");
    }
    
    process.exit(0);
}

main().catch(console.error);
