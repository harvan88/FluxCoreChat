import { systemTemplateProvisioner } from './apps/api/src/services/system-template-provisioner.service';

async function run() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    console.log('🚀 Provisioning schedule template for drjones...');
    await systemTemplateProvisioner.syncScheduleTemplate(accountId, true);
    console.log('✅ Done!');
    process.exit(0);
}

run().catch(console.error);
