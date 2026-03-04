
import { db, fluxcoreProjectorCursors } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const [cursor] = await db.select().from(fluxcoreProjectorCursors).where(eq(fluxcoreProjectorCursors.projectorName, 'chat'));
    console.log(`ChatProjector Cursor: ${cursor?.lastSequenceNumber}`);
}

main().catch(console.error).then(() => process.exit(0));
