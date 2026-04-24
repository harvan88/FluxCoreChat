
import { db, fluxcoreDocumentChunks } from '../index';
import { sql } from 'drizzle-orm';
import { retrievalService } from '../../../../apps/api/src/services/retrieval.service';

async function main() {
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const query = "Modelado 360";

    console.log(`--- DEBUG SEARCH ADAPTIVO ---`);
    
    // 1. ¿Qué modelos detecta?
    const modelsInDB = await db.execute(sql`
        SELECT DISTINCT embedding_model as model
        FROM fluxcore_document_chunks
        WHERE file_id IN (
            SELECT file_id 
            FROM fluxcore_vector_store_files 
            WHERE vector_store_id = ${vsId}::uuid
        )
    `);
    console.log('Modelos detectados:', JSON.stringify(modelsInDB, null, 2));

    // 2. ¿Qué hay en los chunks de ese VS?
    const chunks = await db.execute(sql`
        SELECT id, content, embedding_model 
        FROM fluxcore_document_chunks
        WHERE file_id IN (
            SELECT file_id 
            FROM fluxcore_vector_store_files 
            WHERE vector_store_id = ${vsId}::uuid
        )
    `);
    console.log('Cantidada de chunks vinculados:', chunks.length);

    // 3. Ejecutar búsqueda real
    const result = await retrievalService.search(query, [vsId], accountId);
    console.log('Resultado búsqueda adaptativa:', JSON.stringify(result.chunks, null, 2));

    process.exit(0);
}

main().catch(console.error);
