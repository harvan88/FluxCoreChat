import { db } from '../packages/db/src/index';
import { sql } from 'drizzle-orm';
import { embeddingService } from '../apps/api/src/services/embedding.service';

async function migrateEmbeddings() {
  const vectorStoreId = "48bebce0-a795-42df-9dc5-daf060b2d32b";
  console.log(`🔍 Migrando 13 chunks de la base de datos al nuevo modelo Multilingüe...`);

  try {
    const chunks = await db.execute(sql`
      SELECT id, content 
      FROM fluxcore_document_chunks 
      WHERE vector_store_id = ${vectorStoreId}::uuid
    `);

    console.log(`📦 Chunks encontrados: ${chunks.length}`);

    // Generate new embeddings
    const texts = chunks.map(c => c.content as string);
    const result = await embeddingService.embedBatch(texts, {
        provider: 'local',
        model: 'paraphrase-multilingual-MiniLM-L12-v2'
    });

    for (let i = 0; i < chunks.length; i++) {
        const id = chunks[i].id;
        const newEmbedding = result.embeddings[i];

        // Ensure we properly format the array for pgvector
        const formattedVector = `[${newEmbedding.join(',')}]`;

        await db.execute(sql`
            UPDATE fluxcore_document_chunks 
            SET embedding = ${formattedVector}::vector
            WHERE id = ${id}::uuid
        `);
        console.log(`✅ Chunk ${i+1}/${chunks.length} re-embebido correctamente.`);
    }

    console.log(`🎉 Migración completada. La búsqueda semántica ahora será perfecta para español.`);

  } catch (error: any) {
    console.error("❌ Error en la migración:", error.stack || error.message);
  }
}

migrateEmbeddings().then(() => {
  process.exit(0);
});
