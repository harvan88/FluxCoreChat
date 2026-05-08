import { db, accounts } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function run() {
  const res = await db.select().from(accounts).where(sql`profile != '{}'::jsonb`).limit(5);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
