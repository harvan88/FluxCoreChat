
import { db, conversations } from '@fluxcore/db';

async function main() {
    const all = await db.select().from(conversations).limit(1);
    if (all.length > 0) {
        console.log(all[0].id);
    } else {
        console.log('none');
    }
}

main().catch(console.error);
