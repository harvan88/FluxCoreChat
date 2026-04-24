
import { db } from '../index';
import { fluxcoreDocumentChunks } from '../schema';
import { eq, sql } from 'drizzle-orm';
import { embeddingService } from '../../../../apps/api/src/services/embedding.service';

async function main() {
    const chunkId = 'de4a59a9-e435-4af7-8d4e-5341b9c1ef04'; // El del Modelado
    const query = "Modelado 360";
    
    console.log(`--- DEBUG DE RELEVANCIA CRUDA PARA CHUNK: ${chunkId} ---`);

    // 1. Obtener Vector de la Query
    const queryData = await embeddingService.embedWithConfig(query, {
        provider: 'local',
        model: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384
    });
    const embeddingStr = `[${queryData.embedding.join(',')}]`;

    // 2. Ejecutar SQL sin filtros de cuenta/carpeta
    const result = await db.execute(sql`
        SELECT 
            id,
            account_id,
            vector_store_id,
            embedding_model,
            vector_dims(embedding) as dims,
            1 - (embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) as similarity,
            content ILIKE ${`%${query}%`} as text_match
        FROM fluxcore_document_chunks
        WHERE id = ${chunkId}::uuid
    `);

    console.log('RESULTADOS SQL CRUDO:', JSON.stringify(result, null, 2));

    process.exit(0);
}

main().catch(console.error);
