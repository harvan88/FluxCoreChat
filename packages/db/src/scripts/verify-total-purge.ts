
import { db } from '../index';
import { assets, fluxcoreDocumentChunks, fluxcoreVectorStoreFiles } from '../schema';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('--- AUDITORÍA DE INTEGRIDAD POST-BORRADO ---');

    // 1. Contar Assets Totales
    const assetCount = await db.select({ count: sql`count(*)` }).from(assets);
    console.log(`📦 Assets en la tabla maestra: ${assetCount[0].count}`);

    // 2. Contar Vínculos (Links)
    const linkCount = await db.select({ count: sql`count(*)` }).from(fluxcoreVectorStoreFiles);
    console.log(`🔗 Vínculos en Vector Stores: ${linkCount[0].count}`);

    // 3. Contar Chunks (Vectores)
    const chunkCount = await db.select({ count: sql`count(*)` }).from(fluxcoreDocumentChunks);
    console.log(`📊 Chunks (Vectores) totales: ${chunkCount[0].count}`);

    // 4. Buscar Huérfanos (Chunks sin Asset)
    const orphans = await db.execute(sql`
        SELECT count(*) FROM fluxcore_document_chunks c
        LEFT JOIN assets a ON c.file_id = a.id
        WHERE a.id IS NULL
    `);
    console.log(`👻 Chunks Huérfanos detectados: ${orphans[0].count}`);

    if (parseInt(orphans[0].count as string) === 0) {
        console.log('✅ EXCELENTE: No hay datos fantasma. La purga atómica es perfecta.');
    } else {
        console.error('❌ ADVERTENCIA: Se han encontrado fragmentos sin archivo maestro.');
    }

    process.exit(0);
}

main().catch(console.error);
