
import { db, fluxcoreWorkDefinitions } from '@fluxcore/db';

async function checkDefinitions() {
    const defs = await db.select().from(fluxcoreWorkDefinitions);
    console.log('--- WORK DEFINITIONS ---');
    console.log(JSON.stringify(defs, null, 2));
    process.exit(0);
}

checkDefinitions().catch(console.error);
