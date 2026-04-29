import { db, fluxcoreVectorStores, fluxcoreDocumentChunks, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const SENDER_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d'; // Harold
const RECIPIENT_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // AI Dr. Jones

async function inspect() {
  console.log(`\n🔍 AUDITORÍA DE VECTORES EXTENDIDA`);
  console.log(`--------------------------------------------------`);

  const allChunks = await db.select({
    chunkId: fluxcoreDocumentChunks.id,
    fileId: fluxcoreDocumentChunks.fileId,
    content: fluxcoreDocumentChunks.content,
    accountId: fluxcoreDocumentChunks.accountId,
    assetName: assets.name,
    assetStatus: assets.status
  })
  .from(fluxcoreDocumentChunks)
  .leftJoin(assets, eq(fluxcoreDocumentChunks.fileId, assets.id));

  console.log(`📊 Total de Chunks en el sistema: ${allChunks.length}`);

  for (const chunk of allChunks) {
    if (chunk.assetName && chunk.assetName.includes('precios')) {
      console.log(`\n📄 [MÉDICO] Asset: ${chunk.assetName} (ID: ${chunk.fileId})`);
      console.log(`   Status: ${chunk.assetStatus} | Account: ${chunk.accountId}`);
      console.log(`   CONTENIDO:\n${chunk.content}\n`);
      console.log(`--------------------------------------------------`);
    }
  }
}

inspect().catch(console.error);
