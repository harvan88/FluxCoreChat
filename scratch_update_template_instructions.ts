
import { db, fluxcoreTemplateSettings, templates } from '@fluxcore/db';
import { eq, sql, and } from 'drizzle-orm';
import { SYSTEM_INSTRUCTIONS } from './apps/api/src/core/constants/instructions';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const tag = 'system:schedule';
    
    const [template] = await db.select()
        .from(templates)
        .where(and(
            eq(templates.accountId, accountId),
            sql`${templates.tags} @> ${JSON.stringify([tag])}::jsonb`
        ))
        .limit(1);

    if (template) {
        console.log(`Updating template ${template.id} instructions...`);
        const cleanInstructions = SYSTEM_INSTRUCTIONS.SCHEDULE_TEMPLATE;
        
        await db.update(fluxcoreTemplateSettings)
            .set({ aiUsageInstructions: cleanInstructions })
            .where(eq(fluxcoreTemplateSettings.templateId, template.id));
            
        console.log('✅ Instructions updated in DB.');
    } else {
        console.log('❌ Template not found.');
    }
}

main().catch(console.error);
