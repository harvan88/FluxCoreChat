import { db } from '../packages/db/src/index';
import { sql } from 'drizzle-orm';

async function runTest() {
  const vectorStoreId = "48bebce0-a795-42df-9dc5-daf060b2d32b";
  console.log(`🔍 Buscando la palabra 'cucarach' / 'insecto' en la Base de Datos...`);

  try {
    const exactMatch = await db.execute(sql`
      SELECT content 
      FROM fluxcore_document_chunks 
      WHERE vector_store_id = ${vectorStoreId}::uuid
      AND (content ILIKE '%cucarach%' OR content ILIKE '%cucaracha%')
    `);

    console.log(`\n✅ Ocurrencias exactas de 'cucaracha': ${exactMatch.length}`);
    if (exactMatch.length > 0) {
        console.log(exactMatch[0]);
    }

    const totalChunks = await db.execute(sql`
      SELECT count(*) as count 
      FROM fluxcore_document_chunks 
      WHERE vector_store_id = ${vectorStoreId}::uuid
    `);
    
    console.log(`\n➡️ Total de chunks en la BD para este vector store: ${totalChunks[0].count}`);

  } catch (error: any) {
    console.error("❌ Error en la prueba:", error.stack || error.message);
  }
}

runTest().then(() => {
  process.exit(0);
});
