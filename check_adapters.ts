import { db, fluxcoreRealityAdapters } from '@fluxcore/db';

async function list() {
  const all = await db.select().from(fluxcoreRealityAdapters);
  console.log('--- ALL REGISTERED ADAPTERS ---');
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}

list();
