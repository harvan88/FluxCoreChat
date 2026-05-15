import { db, fluxcoreAssistants } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function checkAssistant() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const assistants = await db.select().from(fluxcoreAssistants).where(eq(fluxcoreAssistants.accountId, accountId));
    
    console.log('Assistants for account:', accountId);
    assistants.forEach(a => {
        console.log(`- ID: ${a.id}, Name: ${a.name}, Status: ${a.status}`);
        console.log(`  ModelConfig:`, a.modelConfig);
    });
    process.exit(0);
}

checkAssistant();
