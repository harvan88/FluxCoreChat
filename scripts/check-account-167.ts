
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const targetId = 'cadcb892-c4d1-42e5-bbac-6655047cbb56';
    console.log(`🔍 Checking for account ${targetId}...`);

    const [account] = await db.select().from(accounts).where(eq(accounts.id, targetId));
    
    if (account) {
        console.log('✅ Account found:', account.username);
    } else {
        console.log('❌ Account NOT found');
    }

    const all = await db.select().from(accounts).limit(5);
    console.log('Available accounts:', all.map(a => `${a.id} (${a.username})`));
}

main().catch(console.error).then(() => process.exit(0));
