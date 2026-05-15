import { db, templates, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, sql } from 'drizzle-orm';

async function main() {
    const accountId = '65d340af-2621-4f1b-a56e-8260b9492167'; // ID de la cuenta Jones
    
    console.log('--- PLANTILLAS EN DB ---');
    const allTemplates = await db.select().from(templates).where(eq(templates.accountId, accountId));
    allTemplates.forEach(t => {
        console.log(`ID: ${t.id} | Name: ${t.name}`);
    });

    console.log('\n--- CHUNKS EN DB (VECTORS) ---');
    const allChunks = await db.select().from(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.accountId, accountId));
    allChunks.forEach(c => {
        const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata;
        console.log(`ChunkID: ${c.id} | TemplateID in Meta: ${meta?.template_id || meta?.templateId} | Content: ${c.content?.substring(0, 30)}...`);
    });
}

main().catch(console.error);
