import { db, websiteConfigs, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function run() {
  const [account] = await db.select().from(accounts).where(eq(accounts.alias, 'drjones')).limit(1);
  if (!account) {
    console.log('Account not found');
    process.exit(0);
  }
  
  const res = await db.select().from(websiteConfigs).where(eq(websiteConfigs.accountId, account.id)).limit(1);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
