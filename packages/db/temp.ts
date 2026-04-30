import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function run() {
  const res = await db.select().from(accounts).where(eq(accounts.id, '65d340af-97ff-4c9b-85d2-b378badeacf4'));
  console.log(res);
  process.exit(0);
}
run();
