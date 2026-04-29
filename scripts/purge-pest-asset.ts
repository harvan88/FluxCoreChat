import { db, fluxcoreDocumentChunks, fluxcoreVectorStoreFiles, assets } from '@fluxcore/db';
import { eq, or } from 'drizzle-orm';

const ASSET_ID = '7c38a521-5224-495a-bd26-f101b5b0e61a'; // Catálogo.md

async function purge() {
  console.log(`\n🧹 INICIANDO PURGA FÍSICA DEL ASSET: ${ASSET_ID}`);
  console.log(`--------------------------------------------------`);

  // 1. Borrar Chunks (Vectores)
  const deletedChunks = await db.delete(fluxcoreDocumentChunks)
    .where(eq(fluxcoreDocumentChunks.fileId, ASSET_ID))
    .returning({ id: fluxcoreDocumentChunks.id });
  console.log(`✅ Chunks eliminados: ${deletedChunks.length}`);

  // 2. Borrar Relaciones con Vector Stores
  const deletedRefs = await db.delete(fluxcoreVectorStoreFiles)
    .where(eq(fluxcoreVectorStoreFiles.fileId, ASSET_ID))
    .returning({ id: fluxcoreVectorStoreFiles.id });
  console.log(`✅ Relaciones con Vector Stores eliminadas: ${deletedRefs.length}`);

  // 3. Borrar el Asset físico (si existe en la tabla assets)
  const deletedAssets = await db.delete(assets)
    .where(eq(assets.id, ASSET_ID))
    .returning({ id: assets.id, name: assets.name });
  
  if (deletedAssets.length > 0) {
    console.log(`✅ Asset maestro eliminado: ${deletedAssets[0].name}`);
  } else {
    console.log(`⚠️ No se encontró el registro maestro en la tabla 'assets'.`);
  }

  console.log(`\n✨ PURGA COMPLETADA. El RAG ahora está libre de este contenido.`);
}

purge().catch(console.error);
