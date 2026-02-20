import { db, fluxcoreAssistants } from '@fluxcore/db';
import { eq, desc, and, or } from 'drizzle-orm';

async function main() {
    const assistants = await db.select().from(fluxcoreAssistants).limit(5);
    console.log(assistants.map(a => ({ id: a.id, accountId: a.accountId, status: a.status })));
    process.exit(0);
}
main();
