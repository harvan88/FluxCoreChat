import { db, templates, fluxcoreTemplateSettings, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, sql, and } from 'drizzle-orm';

async function main() {
    const templateId = '63d63f9a-c7d4-40c4-9430-20b4be0a59c5'; // ID de la plantilla de horarios
    
    console.log(`--- ANALIZANDO PLANTILLA: ${templateId} ---`);
    const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
    
    if (!template) {
        console.log('❌ No se encontró la plantilla.');
        return;
    }

    const [settings] = await db.select().from(fluxcoreTemplateSettings).where(eq(fluxcoreTemplateSettings.templateId, templateId)).limit(1);
    
    console.log(`Nombre: ${template.name}`);
    console.log(`Autorizada AI: ${settings?.authorizeForAI}`);
    console.log(`Instrucciones AI: ${settings?.aiUsageInstructions || 'N/A'}`);
    console.log(`Contenido: ${template.content}`);

    console.log('\n--- VERIFICANDO VECTOR EN DB ---');
    const [chunk] = await db.select()
        .from(fluxcoreDocumentChunks)
        .where(eq(fluxcoreDocumentChunks.fileId, templateId))
        .limit(1);

    if (chunk) {
        console.log(`✅ Fragmento encontrado (ID: ${chunk.id})`);
        console.log(`AccountId en Chunk: ${chunk.accountId}`);
        console.log(`Contenido indexado: ${chunk.content}`);
        const meta = typeof chunk.metadata === 'string' ? JSON.parse(chunk.metadata) : chunk.metadata;
        console.log(`Metadata: ${JSON.stringify(meta)}`);
    } else {
        console.log('❌ NO TIENE VECTOR INDEXADO.');
    }
}

main().catch(console.error);
