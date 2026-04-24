
import { db } from '../index';
import { fluxcoreDocumentChunks, assets } from '../schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
    const assetId = '422741b9-4f17-468b-aed7-f8a114e67203'; // Precios tratamientos
    console.log(`--- AUDITORÍA DE PROPIEDAD PARA ASSET: ${assetId} ---`);

    const chunks = await db.select({
        id: fluxcoreDocumentChunks.id,
        accountId: fluxcoreDocumentChunks.accountId,
        fileId: fluxcoreDocumentChunks.fileId,
        content: fluxcoreDocumentChunks.content
    }).from(fluxcoreDocumentChunks)
    .where(eq(fluxcoreDocumentChunks.fileId, assetId));

    console.log(`Chunks encontrados: ${chunks.length}`);

    for (const chunk of chunks) {
        console.log(`\n[Chunk ${chunk.id}]`);
        console.log(`Account ID grabado: ${chunk.accountId}`);
        console.log(`File ID grabado: ${chunk.fileId}`);
        console.log(`Contenido: ${chunk.content.substring(0, 50)}...`);
    }

    process.exit(0);
}

main().catch(console.error);
