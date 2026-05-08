import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function run() {
  const res = await db.select().from(accounts).where(eq(accounts.alias, 'drjones')).limit(1);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
