
import { db, extensionInstallations } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

async function checkInstallation() {
    const accountId = '4c3a23e2-3c48-4ed6-afbf-21c47e59bc00';
    const inst = await db.select().from(extensionInstallations).where(
        and(
            eq(extensionInstallations.accountId, accountId),
            eq(extensionInstallations.extensionId, '@fluxcore/fluxcore')
        )
    );
    console.log('--- INSTALLATION STATUS ---');
    console.log(JSON.stringify(inst, null, 2));
    process.exit(0);
}

checkInstallation().catch(console.error);
