import { db, accounts, templates } from '@fluxcore/db';

async function main() {
    const accs = await db.select().from(accounts).limit(10);
    console.log('--- ACCOUNTS ---');
    accs.forEach(a => console.log(`ID: ${a.id} | Name: ${a.name}`));

    const tmps = await db.select().from(templates).limit(10);
    console.log('\n--- TEMPLATES ---');
    tmps.forEach(t => console.log(`ID: ${t.id} | Account: ${t.accountId} | Name: ${t.name}`));
}

main().catch(console.error);
