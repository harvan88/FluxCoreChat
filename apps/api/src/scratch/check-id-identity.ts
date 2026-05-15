
import { db, accounts, actors } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const ID_TO_CHECK = '30f7813a-a162-4217-a068-07e050ce9c29';

async function main() {
  console.log(`🔍 BUSCANDO IDENTIDAD PARA ID: ${ID_TO_CHECK}`);

  const [account] = await db.select().from(accounts).where(eq(accounts.id, ID_TO_CHECK)).limit(1);
  if (account) {
    console.log('✅ ENCONTRADO EN ACCOUNTS:');
    console.log(JSON.stringify(account, null, 2));
  } else {
    console.log('❌ NO ENCONTRADO EN ACCOUNTS');
  }

  const [actor] = await db.select().from(actors).where(eq(actors.id, ID_TO_CHECK)).limit(1);
  if (actor) {
    console.log('✅ ENCONTRADO EN ACTORS:');
    console.log(JSON.stringify(actor, null, 2));
  } else {
    console.log('❌ NO ENCONTRADO EN ACTORS');
  }
}

main().catch(console.error);
