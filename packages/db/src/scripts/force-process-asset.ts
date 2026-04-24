
import { db } from '../index';
import { fluxcoreFiles, fluxcoreVectorStoreFiles } from '../schema';
import { eq, and } from 'drizzle-orm';
import { documentProcessingService } from '../../../../apps/api/src/services/document-processing.service';

async function forceProcess() {
    const assetId = '422741b9-4f17-468b-aed7-f8a114e67203';
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';

    console.log('--- INICIANDO PROCESAMIENTO VECTORIAL FORZADO ---');

    // 1. Obtener contenido del archivo local
    const [fileData] = await db.select().from(fluxcoreFiles).where(eq(fluxcoreFiles.id, assetId));
    if (!fileData || !fileData.textContent) {
        console.error('❌ ERROR: No se encontró contenido de texto para el asset.');
        process.exit(1);
    }

    // 2. Obtener el linkId
    const [link] = await db.select().from(fluxcoreVectorStoreFiles)
        .where(and(eq(fluxcoreVectorStoreFiles.vectorStoreId, vsId), eq(fluxcoreVectorStoreFiles.fileId, assetId)));
    
    if (!link) {
        console.error('❌ ERROR: El vínculo no existe.');
        process.exit(1);
    }

    console.log(`🚀 Procesando ${fileData.name} (${fileData.textContent.length} caracteres)...`);

    // 3. Ejecutar motor de procesamiento real
    try {
        console.log(`📡 Invocando motor para Link: ${link.id}, VS: ${vsId}`);
        const result = await documentProcessingService.processDocument(
            link.id,
            vsId,
            accountId,
            fileData.textContent,
            fileData.mimeType || 'text/plain'
        );

        console.log(`🏁 Respuesta del motor:`, JSON.stringify(result, null, 2));

        // Verificación post-vuelo inmediata
        const count = await db.select({ count: sql`count(*)` }).from(fluxcoreDocumentChunks)
            .where(eq(fluxcoreDocumentChunks.fileId, assetId));
        
        console.log(`📊 Chunks reales en DB para Asset ${assetId}: ${count[0].count}`);
    } catch (err: any) {
        console.error(`❌ FALLO CRÍTICO en el motor:`, err);
    }

    process.exit(0);
}

forceProcess().catch(console.error);
