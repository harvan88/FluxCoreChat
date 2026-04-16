import { db, templates, fluxcoreTemplateSettings, templateAssets, assets } from '@fluxcore/db';
import { eq, sql } from 'drizzle-orm';

async function main() {
    console.log(`--- Analizando Plantillas en TODA la base de datos ---\n`);
    
    // Buscar la primera que tenga algo interesante
    const rows = await db
        .select({
            template: templates,
            settings: fluxcoreTemplateSettings
        })
        .from(templates)
        .leftJoin(fluxcoreTemplateSettings, eq(templates.id, fluxcoreTemplateSettings.templateId))
        .limit(20);

    for (const { template, settings } of rows) {
        const linkedAssets = await db
            .select({
                assetName: assets.name,
                slot: templateAssets.slot
            })
            .from(templateAssets)
            .innerJoin(assets, eq(templateAssets.assetId, assets.id))
            .where(eq(templateAssets.templateId, template.id));

        console.log(`[PLANTILLA] ID: ${template.id} | Nombre: ${template.name} | Account: ${template.accountId}`);
        console.log(`  - Content: ${template.content.substring(0, 50)}...`);
        console.log(`  - Variables: ${JSON.stringify(template.variables)}`);
        console.log(`  - Tags: ${JSON.stringify(template.tags)}`);
        
        if (linkedAssets.length > 0) {
            console.log(`  - Assets:`, linkedAssets.map(a => `${a.assetName} [${a.slot}]`).join(', '));
        }
        console.log('--------------------------------------------------');
    }
}

main().catch(console.error);
