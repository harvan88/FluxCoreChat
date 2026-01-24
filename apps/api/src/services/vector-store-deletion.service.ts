import { db } from '@fluxcore/db';
import { fluxcoreVectorStores, fluxcoreVectorStoreFiles } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import { getOpenAIDriver } from './fluxcore/vector-store.service';

export async function deleteVectorStoreCascade(storeId: string, accountId: string) {
  // 1. Delete all files in the vector store
  const files = await db.select()
    .from(fluxcoreVectorStoreFiles)
    .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, storeId));

  for (const file of files) {
    if (file.backend === 'openai' && file.externalId) {
      await getOpenAIDriver().deleteFile(storeId, file.externalId);
    }
    await db.delete(fluxcoreVectorStoreFiles)
      .where(eq(fluxcoreVectorStoreFiles.id, file.id));
  }

  // 2. Delete the vector store
  const [store] = await db.select()
    .from(fluxcoreVectorStores)
    .where(and(
      eq(fluxcoreVectorStores.id, storeId),
      eq(fluxcoreVectorStores.accountId, accountId)
    ));

  if (store?.backend === 'openai' && store.externalId) {
    await getOpenAIDriver().deleteStore(store.externalId);
  }

  // 3. Delete local store record
  await db.delete(fluxcoreVectorStores)
    .where(eq(fluxcoreVectorStores.id, storeId));
}
