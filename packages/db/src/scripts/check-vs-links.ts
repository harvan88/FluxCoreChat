
import { db } from '../index';
import { fluxcoreVectorStoreFiles, assets } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    console.log(`--- VÍNCULOS ACTIVOS EN VS: ${vsId} ---`);

    const links = await db.select({
        fileId: fluxcoreVectorStoreFiles.fileId,
        status: fluxcoreVectorStoreFiles.status,
        fileName: assets.name
    }).from(fluxcoreVectorStoreFiles)
    .leftJoin(assets, eq(fluxcoreVectorStoreFiles.fileId, assets.id))
    .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, vsId));

    links.forEach(l => {
        console.log(`- Archivo: ${l.fileName} (${l.fileId}) | Estado: ${l.status}`);
    });

    if (links.length === 0) {
        console.log('No hay vínculos en este Vector Store.');
    }

    process.exit(0);
}

main().catch(console.error);
