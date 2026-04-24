
import { db } from '../index';
import { fluxcoreDocumentChunks } from '../schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
    const chunkId = 'de4a59a9-e435-4af7-8d4e-5341b9c1ef04'; // El del Modelado
    console.log(`--- ADN CHECK PARA CHUNK: ${chunkId} ---`);

    const result = await db.execute(sql`
        SELECT 
            id,
            embedding IS NOT NULL as has_embedding,
            CASE WHEN embedding IS NOT NULL THEN vector_dims(embedding) ELSE 0 END as dims,
            embedding_model
        FROM fluxcore_document_chunks
        WHERE id = ${chunkId}::uuid
    `);

    console.log('RESULTADO ADN:', JSON.stringify(result, null, 2));

    process.exit(0);
}

main().catch(console.error);
