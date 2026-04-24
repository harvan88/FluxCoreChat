
import { db } from '../index';
import { sql } from 'drizzle-orm';
import { embeddingService } from '../../../../apps/api/src/services/embedding.service';

async function main() {
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    const query = "Modelado 360";

    console.log(`--- SIMILITUD CRUDA POSTGRES: "${query}" ---`);

    // 1. Generar Vector
    const result = await embeddingService.embedWithConfig(query, {
        provider: 'local',
        model: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384
    });
    const embeddingStr = `[${result.embedding.join(',')}]`;

    // 2. Buscar sin Filtros
    const rawResults = await db.execute(sql`
        SELECT 
            id,
            content,
            1 - (embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) as similarity
        FROM fluxcore_document_chunks
        WHERE file_id IN (
            SELECT file_id FROM fluxcore_vector_store_files WHERE vector_store_id = ${vsId}::uuid
        )
    `);

    console.log('Resultados Crudos:', JSON.stringify(rawResults, null, 2));

    process.exit(0);
}

main().catch(console.error);
