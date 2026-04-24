
import { db } from '../index';
import { fluxcoreDocumentChunks, assets, fluxcoreVectorStoreFiles } from '../schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
    console.log('--- AUDITORÍA DE FRAGMENTOS (CHUNKS) ---');

    const allChunks = await db.select({
        id: fluxcoreDocumentChunks.id,
        fileId: fluxcoreDocumentChunks.fileId,
        model: fluxcoreDocumentChunks.embeddingModel,
        content: fluxcoreDocumentChunks.content,
        fileName: assets.name
    }).from(fluxcoreDocumentChunks)
    .leftJoin(assets, eq(fluxcoreDocumentChunks.fileId, assets.id));

    console.log(`Total Chunks: ${allChunks.length}`);

    for (const chunk of allChunks) {
        console.log(`\n[Chunk ${chunk.id}]`);
        console.log(`Archivo: ${chunk.fileName} (${chunk.fileId})`);
        console.log(`Modelo: ${chunk.model}`);
        console.log(`Contenido: ${chunk.content.substring(0, 100)}...`);

        // Buscar vínculos de este archivo
        const links = await db.select().from(fluxcoreVectorStoreFiles).where(eq(fluxcoreVectorStoreFiles.fileId, chunk.fileId));
        console.log(`Vínculos a VS: ${links.map(l => l.vectorStoreId).join(', ')}`);
    }

    process.exit(0);
}

main().catch(console.error);
