import { db, fluxcoreVectorStoreFiles, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function listVSFiles() {
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    console.log(`\n📂 LISTANDO ARCHIVOS - Vector Store: ${vsId}`);
    console.log('════════════════════════════════════════════════════════════');

    try {
        const links = await db.select({
            id: fluxcoreVectorStoreFiles.id,
            status: fluxcoreVectorStoreFiles.status,
            assetName: assets.name,
            assetId: assets.id,
            assetStatus: assets.status
        })
        .from(fluxcoreVectorStoreFiles)
        .leftJoin(assets, eq(fluxcoreVectorStoreFiles.fileId, assets.id))
        .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, vsId));

        links.forEach(l => {
            console.log(`📄 Archivo: ${l.assetName}`);
            console.log(`   - Status Link: ${l.status}`);
            console.log(`   - Status Asset: ${l.assetStatus}`);
            console.log(`   - Asset ID: ${l.assetId}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

listVSFiles();
