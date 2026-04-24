
import { db } from '../index';
import { fluxcoreVectorStoreFiles } from '../schema';
import { eq, and } from 'drizzle-orm';

async function main() {
    const assetId = '6a4641d5-5da0-490d-9d2e-bb8b6c744588';
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';

    console.log(`--- FORZANDO VÍNCULO ASSET-VS ---`);
    
    const [existing] = await db.select().from(fluxcoreVectorStoreFiles)
        .where(and(eq(fluxcoreVectorStoreFiles.vectorStoreId, vsId), eq(fluxcoreVectorStoreFiles.fileId, assetId)));

    if (existing) {
        console.log('✅ El vínculo ya existe físicamente.');
    } else {
        await db.insert(fluxcoreVectorStoreFiles).values({
            vectorStoreId: vsId,
            fileId: assetId,
            status: 'completed'
        });
        console.log('🚀 Vínculo creado exitosamente.');
    }
    process.exit(0);
}

main().catch(console.error);
