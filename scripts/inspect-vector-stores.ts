import { db } from '@fluxcore/db';
import { fluxcoreVectorStores } from '@fluxcore/db';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Inspecting vector stores table');
  
  // Get first 5 vector stores
  const stores = await db.select().from(fluxcoreVectorStores).limit(5);
  
  const output = JSON.stringify(stores, null, 2);
  const filePath = path.join(__dirname, '..', 'vector-stores-sample.json');
  fs.writeFileSync(filePath, output);
  console.log(`Wrote sample to ${filePath}`);
}

main().catch(console.error);
