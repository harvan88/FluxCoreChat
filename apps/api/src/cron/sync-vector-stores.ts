import { syncOpenAIVectorStores } from '../services/vector-store-sync.service';

async function main() {
  console.log('Starting vector store synchronization');
  await syncOpenAIVectorStores();
  console.log('Synchronization completed');
}

main().catch(console.error);
