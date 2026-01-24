import { getOpenAIClient, getVectorStoresApi } from './openai-sync.service';
import { db } from '@fluxcore/db';
import { fluxcoreVectorStores } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

export async function syncOpenAIVectorStores() {
  const client = getOpenAIClient();
  const vectorStoresApi = getVectorStoresApi(client);

  if (!vectorStoresApi?.list) {
    console.warn('OpenAI vectorStores.list API not available');
    return;
  }

  const openaiStores = await vectorStoresApi.list();

  for (const store of openaiStores.data) {
    await db.update(fluxcoreVectorStores)
      .set({
        status: store.status,
        fileCounts: store.file_counts,
        usageBytes: store.usage_bytes,
        lastActiveAt: store.last_active_at ? new Date(store.last_active_at * 1000) : null,
        expiresAfter: store.expires_after
      })
      .where(eq(fluxcoreVectorStores.externalId, store.id));
  }
}
