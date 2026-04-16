import { db } from '../packages/db/src/index';
import { embeddingService } from '../apps/api/src/services/embedding.service';
import { retrievalService } from '../apps/api/src/services/retrieval.service';

async function runTest() {
  const accountId = "2fef52df-7262-46c5-96ba-7fd22eea188c";
  const vectorStoreId = "48bebce0-a795-42df-9dc5-daf060b2d32b";
  const query = "cucaracha";

  console.log(`🔍 Iniciando prueba RAG Soberano...`);
  console.log(`➡️ Query: "${query}"`);

  // Config mock
  const options = {
    topK: 5,
    minScore: 0.1
  };

  try {
    const result = await retrievalService.searchAllAccessible(
      query,
      accountId,
      options
    );

    console.log(`\n✅ Resultados encontrados en la cuenta: ${result.chunks.length}`);
    if (result.chunks.length > 0) {
      result.chunks.forEach((chunk, i) => {
        console.log(`\n--- Fragmento ${i + 1} (Similitud: ${chunk.similarity.toFixed(4)}) ---`);
        console.log(chunk.content.substring(0, 300) + "...");
        console.log(`Ref: ${chunk.metadata?.documentTitle || chunk.fileId}`);
      });
    } else {
      console.log(`❌ No se encontraron fragmentos para la query.`);
    }
  } catch (error: any) {
    console.error("❌ Error en la prueba:", error.stack || error.message);
  }
}

runTest().then(() => {
  console.log('Test terminado.');
  process.exit(0);
});
