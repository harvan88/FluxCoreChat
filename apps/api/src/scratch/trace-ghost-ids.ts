import { db, templates, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, sql, inArray } from 'drizzle-orm';

async function main() {
    const ghostIds = [
        'f3467c80-339c-4a0a-9ec6-cc06ca6a7be8',
        '7991d74e-3c7a-4f29-bb4c-a04b1246226a'
    ];
    
    console.log('--- RASTREANDO IDs FANTASMA EN TODA LA DB ---');
    
    for (const id of ghostIds) {
        console.log(`\n🔎 Rastreando ID: ${id}`);
        
        // 1. En Tabla Templates
        const [template] = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
        if (template) {
            console.log(`✅ Encontrado en Templates: Name=${template.name}, AccountId=${template.accountId}`);
        } else {
            console.log('❌ No está en la tabla Templates.');
        }

        // 2. En Tabla Chunks (Vectores)
        const chunks = await db.select().from(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.fileId, id));
        if (chunks.length > 0) {
            console.log(`✅ Encontrado en Chunks: Count=${chunks.length}`);
            chunks.forEach(c => {
                console.log(`   - ChunkID: ${c.id}, AccountId=${c.accountId}, Content=${c.content?.substring(0, 30)}...`);
            });
        } else {
            console.log('❌ No está en la tabla Chunks.');
        }
    }
}

main().catch(console.error);
