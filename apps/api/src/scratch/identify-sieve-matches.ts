import { db, templates, fluxcoreTemplateSettings } from '@fluxcore/db';
import { inArray, eq } from 'drizzle-orm';

async function main() {
    const targetIds = [
        'f3467c80-339c-4a0a-9ec6-cc06ca6a7be8',
        '7991d74e-3c7a-4f29-bb4c-a04b1246226a'
    ];
    
    console.log('--- BUSCANDO PLANTILLAS SUGERIDAS POR EL TAMIZ ---');
    const matches = await db.select().from(templates).where(inArray(templates.id, targetIds));
    
    for (const t of matches) {
        const [settings] = await db.select().from(fluxcoreTemplateSettings).where(eq(fluxcoreTemplateSettings.templateId, t.id)).limit(1);
        console.log(`\nID: ${t.id}`);
        console.log(`Nombre: ${t.name}`);
        console.log(`Instrucciones AI: ${settings?.aiUsageInstructions || 'N/A'}`);
        console.log(`Contenido (Snippet): ${t.content?.substring(0, 50)}...`);
    }
    
    if (matches.length === 0) {
        console.log('❌ No se encontraron plantillas con esos IDs en la tabla principal.');
    }
}

main().catch(console.error);
