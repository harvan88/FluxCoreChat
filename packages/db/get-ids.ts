import { db } from './src';
import { accounts, conversations } from './src/schema';

async function main() {
    const allAccounts = await db.select().from(accounts).limit(1);
    const allConversations = await db.select().from(conversations).limit(1);

    console.log(JSON.stringify({
        account: allAccounts[0],
        conversation: allConversations[0]
    }, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
