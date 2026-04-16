import { db, fluxcoreVectorStores } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const ACCOUNT_ID = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno

async function list() {
    const list = await db.select().from(fluxcoreVectorStores).where(eq(fluxcoreVectorStores.accountId, ACCOUNT_ID));
    console.table(list.map(v => ({ id: v.id, name: v.name })));
    process.exit(0);
}

list().catch(console.error);
