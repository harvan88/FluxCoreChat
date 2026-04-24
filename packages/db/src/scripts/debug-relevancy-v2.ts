
import { db } from '../index';
import { fluxcoreDocumentChunks } from '../schema';
import { eq, sql } from 'drizzle-orm';
import { embeddingService } from '../../../../apps/api/src/services/embedding.service';

async function main() {
    const chunkId = 'de4a59a9-e435-4af7-8d4e-5341b9c1ef04'; // Modelado 360
    const query = "Modelado 360";
    
    console.log(`--- DEBUG MATEMÁTICO: "${query}" vs CHUNK ${chunkId} ---`);

    // 1. Generar Vector de Query
    const queryData = await embeddingService.embedWithConfig(query, {
        provider: 'local',
        model: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384
    });
    const embeddingStr = `[${queryData.embedding.join(',')}]`;

    // 2. Calcular Similitud Cruda (Solo este chunk)
    const result = await db.execute(sql`
        SELECT 
            id,
            content,
            1 - (embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) as similarity,
            vector_dims(embedding) as dims
        FROM fluxcore_document_chunks
        WHERE id = ${chunkId}::uuid
    `);

    console.log('RESULTADO MATEMÁTICO:', JSON.stringify(result, null, 2));

    process.exit(0);
}

main().catch(console.error);
