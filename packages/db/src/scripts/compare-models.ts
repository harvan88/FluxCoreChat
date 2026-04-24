
import { db } from '../index';
import { fluxcoreDocumentChunks, assets } from '../schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
    console.log('--- COMPARACIÓN DE MODELOS DE EMBEDDING ---');

    const chunks = await db.select({
        id: fluxcoreDocumentChunks.id,
        model: fluxcoreDocumentChunks.embeddingModel,
        fileName: assets.name
    }).from(fluxcoreDocumentChunks)
    .leftJoin(assets, eq(fluxcoreDocumentChunks.fileId, assets.id));

    chunks.forEach(c => {
        console.log(`[${c.fileName}] Chunk ${c.id}: "${c.model}"`);
    });

    process.exit(0);
}

main().catch(console.error);
