import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("=== INSPECCIONANDO CHUNK DE ALTO PALERMO EN DETALLE ===");
    
    const result = await db.execute(sql`
        SELECT 
            c.id, 
            c.account_id,
            c.vector_store_id,
            vector_dims(c.embedding) as dims,
            c.content 
        FROM fluxcore_document_chunks c
        WHERE c.content ILIKE '%alto palermo%'
        LIMIT 1
    `);
    
    if (result.length > 0) {
        console.log("ID:", result[0].id);
        console.log("Account ID:", result[0].account_id);
        console.log("Vector Store ID:", result[0].vector_store_id);
        console.log("Dimensiones:", result[0].dims);
        console.log("Contenido (recortado):", result[0].content.substring(0, 100));
    } else {
        console.log("No se encontró el chunk.");
    }
    
    process.exit(0);
}

main().catch(console.error);
