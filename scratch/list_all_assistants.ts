import { db, assistants } from '@fluxcore/db';

async function listAllAssistants() {
    const all = await db.select().from(assistants);
    console.log(JSON.stringify(all, null, 2));
}

listAllAssistants();
