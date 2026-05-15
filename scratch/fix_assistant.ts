import { db, assistants } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function fixAssistantModel() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const [assistant] = await db
        .select()
        .from(assistants)
        .where(eq(assistants.accountId, accountId))
        .limit(1);

    if (assistant) {
        const config = assistant.modelConfig as any;
        config.model = 'gemini-3.1-flash-lite-preview';
        
        await db
            .update(assistants)
            .set({ modelConfig: config })
            .where(eq(assistants.id, assistant.id));
        
        console.log(`Updated assistant ${assistant.id} to use gemini-flash-latest`);
    }
}

fixAssistantModel();
