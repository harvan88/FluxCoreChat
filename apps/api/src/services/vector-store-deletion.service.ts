import { db } from '@fluxcore/db';
import { fluxcoreVectorStores, fluxcoreVectorStoreFiles, fluxcoreAssistantVectorStores, fluxcoreAssistants } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import { getOpenAIDriver } from './fluxcore/vector-store.service';

export async function deleteVectorStoreCascade(storeId: string, accountId: string) {
  // 0. Check if used by any assistant
  const linkedAssistants = await db
    .select({ id: fluxcoreAssistants.id, name: fluxcoreAssistants.name })
    .from(fluxcoreAssistantVectorStores)
    .innerJoin(
      fluxcoreAssistants,
      eq(fluxcoreAssistantVectorStores.assistantId, fluxcoreAssistants.id)
    )
    .where(eq(fluxcoreAssistantVectorStores.vectorStoreId, storeId));

  if (linkedAssistants.length > 0) {
    const names = linkedAssistants.map(a => a.name).join(', ');
    const err = new Error(`No se puede eliminar: esta base de conocimiento está siendo usada por: ${names}`) as any;
    err.statusCode = 409;
    err.details = { usedByAssistants: linkedAssistants };
    throw err;
  }

  // 1. Get store info before deleting files
  const [store] = await db.select()
    .from(fluxcoreVectorStores)
    .where(and(
      eq(fluxcoreVectorStores.id, storeId),
      eq(fluxcoreVectorStores.accountId, accountId)
    ));

  if (!store) return;

  // 2. Cascade File Deletion
  const files = await db.select()
    .from(fluxcoreVectorStoreFiles)
    .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, storeId));

  const driver = getOpenAIDriver();

  for (const file of files) {
    // REGLA: Si es OpenAI, proceso en dos pasos (Unlink -> Delete)
    if (store.backend === 'openai' && file.externalId && store.externalId) {
      try {
        // El driver.deleteFile ya hace unlink y delete físicamente
        await driver.deleteFile(store.externalId, file.externalId);
      } catch (e) {
        console.error(`[delete-cascade] Error cleaning up file ${file.externalId} from OpenAI:`, e);
      }
    }

    // Borrar registro de vinculación local
    await db.delete(fluxcoreVectorStoreFiles)
      .where(eq(fluxcoreVectorStoreFiles.id, file.id));
  }

  // 3. Delete the vector store in OpenAI
  if (store.backend === 'openai' && store.externalId) {
    try {
      await driver.deleteStore(store.externalId);
    } catch (e) {
      console.error(`[delete-cascade] Error deleting store ${store.externalId} from OpenAI:`, e);
    }
  }

  // 4. Delete local store record
  await db.delete(fluxcoreVectorStores)
    .where(eq(fluxcoreVectorStores.id, storeId));
}
