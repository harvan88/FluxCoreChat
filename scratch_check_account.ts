
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    
    console.log('--- ACCOUNT DETAILS ---');
    console.log(`ID: ${account.id}`);
    console.log(`Name: ${account.displayName}`);
    console.log(`Timezone: ${account.timezone}`);
    console.log(`Country: ${account.country}`);
    
    console.log('\n--- NODE.JS TIME TEST ---');
    const now = new Date();
    const tz = account.timezone || 'UTC';
    
    const formatted = new Intl.DateTimeFormat('es-AR', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(now);
    
    console.log(`Current Server Time (UTC): ${now.toISOString()}`);
    console.log(`Current Resolved Time (${tz}): ${formatted}`);
}

main().catch(console.error);
