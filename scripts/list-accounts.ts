
import { db, accounts } from '@fluxcore/db';

async function listAccounts() {
    const list = await db.select().from(accounts).limit(5);
    console.log(JSON.stringify(list, null, 2));
    process.exit(0);
}

listAccounts().catch(console.error);
