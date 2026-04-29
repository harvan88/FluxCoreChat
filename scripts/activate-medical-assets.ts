import { db, assets } from '@fluxcore/db';
import { inArray } from 'drizzle-orm';

const ASSET_IDS = [
  'bba423fa-1d1e-489c-99f3-f0ab5f7dca84',
  '806c4309-b9e0-4ddb-a67d-b3eede36760f'
];

async function activate() {
  console.log(`\n🔓 ACTIVANDO ASSETS MÉDICOS: ${ASSET_IDS.join(', ')}`);
  console.log(`--------------------------------------------------`);

  const updated = await db.update(assets)
    .set({ status: 'ready', updatedAt: new Date() })
    .where(inArray(assets.id, ASSET_IDS))
    .returning({ id: assets.id, name: assets.name, status: assets.status });

  updated.forEach(asset => {
    console.log(`✅ Asset ACTIVADO: ${asset.name} (${asset.id}) -> Status: ${asset.status}`);
  });

  console.log(`\n✨ OPERACIÓN COMPLETADA. Deberías verlos ahora en tu UI.`);
}

activate().catch(console.error);
