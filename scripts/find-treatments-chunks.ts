import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function findSpecificChunks() {
    const assetId = '3b874e89-c62c-48b0-aa1b-0cb46a695efb';
    console.log(`\n🔍 BUSCANDO CHUNKS PARA ASSET: ${assetId}`);

    try {
        const chunks = await db.select().from(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.fileId, assetId));
        
        console.log(`Resultado: ${chunks.length} chunks encontrados.`);
        chunks.forEach(c => console.log(`🧩 ID: ${c.id} | Cuenta: ${c.accountId} | Status: OK`));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

findSpecificChunks();
