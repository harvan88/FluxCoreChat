import { db, templates } from './packages/db';
import { eq } from 'drizzle-orm';

async function check() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const res = await db.select().from(templates).where(eq(templates.accountId, accountId));
    console.log(JSON.stringify(res, null, 2));
}

check().catch(console.error);
