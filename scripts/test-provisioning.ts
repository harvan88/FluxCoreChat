import { systemTemplateProvisioner } from '../apps/api/src/services/system-template-provisioner.service';
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function test() {
    const [account] = await db.select({ id: accounts.id }).from(accounts).limit(1);
    if (!account) {
        console.error('No accounts found');
        return;
    }

    console.log(`Testing for account: ${account.id}`);
    const templateId = await systemTemplateProvisioner.ensureScheduleTemplate(account.id);
    console.log(`Template created/ensured: ${templateId}`);
    
    process.exit(0);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
