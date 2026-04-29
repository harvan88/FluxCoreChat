import { db, accountRuntimeConfig } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // AI Dr. Jones

async function checkConfig() {
  console.log(`\n⚙️ REVISANDO CONFIGURACIÓN DE RUNTIME - CUENTA: ${ACCOUNT_ID}`);
  console.log(`--------------------------------------------------`);

  const config = await db.select().from(accountRuntimeConfig).where(eq(accountRuntimeConfig.accountId, ACCOUNT_ID));
  
  if (config.length === 0) {
    console.log('⚠️ No se encontró configuración de runtime para esta cuenta.');
    return;
  }

  console.log(`🚀 Runtime: ${config[0].runtime}`);
  console.log(`📦 Vector Stores Autorizados:`, JSON.stringify(config[0].config.vectorStoreIds, null, 2));
  console.log(`🌡️ Temperatura: ${config[0].config.temperature}`);
}

checkConfig().catch(console.error);
