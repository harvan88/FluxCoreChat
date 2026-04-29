import { db, fluxcoreVectorStoreFiles, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { documentProcessingService } from '../apps/api/src/services/document-processing.service';
import { fileService } from '../apps/api/src/services/file.service';

async function forceReprocess() {
    const assetId = '3b874e89-c62c-48b0-aa1b-0cb46a695efb'; // precios de tratamientos.md
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';

    console.log(`\n⚙️ REPROCESANDO: ${assetId}`);
    
    try {
        // 1. Obtener el link
        const [link] = await db.select().from(fluxcoreVectorStoreFiles)
            .where(eq(fluxcoreVectorStoreFiles.fileId, assetId));
        
        if (!link) {
            console.error('❌ No se encontró el link al Vector Store.');
            process.exit(1);
        }

        // 2. Obtener el contenido (Si es un asset local, debería tener contenido en fluxcore_files)
        // Intentamos obtener el contenido del archivo central
        const textContent = await fileService.getTextContent(assetId);
        
        if (!textContent) {
            console.error('❌ El archivo no tiene contenido de texto almacendo.');
            process.exit(1);
        }

        console.log(`📝 Contenido recuperado (${textContent.length} bytes).`);

        // 3. Disparar procesamiento
        console.log('🚀 Enviando a DocumentProcessingService...');
        await documentProcessingService.processDocument(
            link.id,
            vsId,
            accountId,
            textContent,
            'text/markdown'
        );

        console.log('✅ Procesamiento completado.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

forceReprocess();
