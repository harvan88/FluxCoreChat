import { db, templates, fluxcoreTemplateSettings, templateAssets, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno
    
    console.log(`--- Analizando Plantillas Complejas de Ragno (${accountId}) ---\n`);
    
    const rows = await db
        .select({
            template: templates,
            settings: fluxcoreTemplateSettings
        })
        .from(templates)
        .leftJoin(fluxcoreTemplateSettings, eq(templates.id, fluxcoreTemplateSettings.templateId))
        .where(eq(templates.accountId, accountId));

    for (const { template, settings } of rows) {
        const linkedAssets = await db
            .select({
                assetName: assets.name,
                slot: templateAssets.slot
            })
            .from(templateAssets)
            .innerJoin(assets, eq(templateAssets.assetId, assets.id))
            .where(eq(templateAssets.templateId, template.id));

        const hasComplexity = (template.variables && template.variables.length > 0) || 
                              (template.tags && template.tags.length > 0) || 
                              (linkedAssets.length > 0) ||
                              (template.category !== null);

        if (!hasComplexity) continue;

        console.log(`[PLANTILLA] ID: ${template.id} | Nombre: ${template.name}`);
        console.log(`  - Content: ${template.content.substring(0, 100)}...`);
        console.log(`  - Categoría: ${template.category}`);
        console.log(`  - Tags: ${JSON.stringify(template.tags)}`);
        console.log(`  - Variables: ${JSON.stringify(template.variables, null, 2)}`);
        console.log(`  - Settings AI:`, settings ? {
            authorizeForAI: settings.authorizeForAI,
            instructions: settings.aiUsageInstructions,
            permissions: {
                name: settings.aiIncludeName,
                content: settings.aiIncludeContent,
                instr: settings.aiIncludeInstructions
            }
        } : 'SIN SETTINGS');

        if (linkedAssets.length > 0) {
            console.log(`  - Assets (${linkedAssets.length}):`, linkedAssets.map(a => `${a.assetName} [${a.slot}]`).join(', '));
        }
        console.log('--------------------------------------------------');
    }
}

main().catch(console.error);
