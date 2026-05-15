import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { sql, eq, and } from 'drizzle-orm';
import { embeddingService } from '../services/embedding.service';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const query = 'Puedo ir ahora?';
    const MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2';

    console.log(`🔎 PROBANDO BÚSQUEDA SEMÁNTICA PARA: "${query}"`);
    
    const { embedding } = await embeddingService.embedWithConfig(query, {
        provider: 'local',
        model: MODEL_NAME,
        dimensions: 384
    });
    
    const embeddingStr = `[${embedding.join(',')}]`;

    const rawResults = await db.execute(sql`
        SELECT 
            id,
            file_id,
            content,
            1 - (embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) as score
        FROM fluxcore_document_chunks
        WHERE account_id = ${accountId}::uuid
          AND metadata::text LIKE '%template%'
          AND embedding IS NOT NULL
        ORDER BY score DESC
    `);

    console.log('\n--- RESULTADOS DE BÚSQUEDA (TODOS) ---');
    (rawResults as any).forEach((r: any, i: number) => {
        console.log(`${i+1}. Score: ${r.score.toFixed(4)} | FileID: ${r.file_id} | Content: ${r.content?.substring(0, 50)}...`);
    });
}

main().catch(console.error);
