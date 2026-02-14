
import { db, accounts } from '@fluxcore/db';
import { ilike } from 'drizzle-orm';

async function findAccounts() {
    const list = await db.select().from(accounts).where(ilike(accounts.displayName, '%Chat Test User%'));
    console.log('--- MATCHING ACCOUNTS ---');
    console.log(JSON.stringify(list, null, 2));
    process.exit(0);
}

findAccounts().catch(console.error);
