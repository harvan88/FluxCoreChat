
import { db, fluxcoreDocumentChunks } from '../index';
import { sql } from 'drizzle-orm';

async function main() {
    console.log(`--- DEBUG: DATOS DE PLANTILLAS EN FLUXCORE ---`);

    const results = await db.execute(sql`
        SELECT 
            id, 
            file_id, 
            account_id,
            metadata,
            (embedding IS NOT NULL) as has_embedding
        FROM fluxcore_document_chunks
        WHERE metadata->>'type' = 'template'
        LIMIT 10
    `);

    console.log(`Encontrados ${results.length} fragmentos de plantillas.`);
    results.forEach((r: any) => {
        console.log(` - Chunk: ${r.id} | File: ${r.file_id} | Embed: ${r.has_embedding} | Meta: ${r.metadata}`);
    });

    process.exit(0);
}

main().catch(console.error);
