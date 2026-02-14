
import { db, users } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function findUser() {
    const ownerUserId = 'c7e1e240-0280-4572-9360-05802c15b81f';
    const [user] = await db.select().from(users).where(eq(users.id, ownerUserId));
    console.log('--- USER DATA ---');
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
}

findUser().catch(console.error);
