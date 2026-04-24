
import { db } from '../index';
import { assets, fluxcoreVectorStoreFiles } from '../schema';
import { eq } from 'drizzle-orm';
import { documentProcessingService } from '../../../../apps/api/src/services/document-processing.service';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    console.log(`--- RE-PROCESANDO TODO PARA DR. JONES (${accountId}) ---`);

    // 1. Obtener todos los assets de la cuenta
    const jonesAssets = await db.select().from(assets).where(eq(assets.accountId, accountId));
    console.log(`Encontrados ${jonesAssets.length} archivos.`);

    for (const asset of jonesAssets) {
        console.log(`\n🔄 Procesando: ${asset.name} (${asset.id})...`);
        
        // Buscar a qué VS está vinculado
        const links = await db.select().from(fluxcoreVectorStoreFiles).where(eq(fluxcoreVectorStoreFiles.fileId, asset.id));
        const vsIds = links.map(l => l.vectorStoreId);

        if (vsIds.length === 0) {
            console.log(`⚠️ Archivo sin vínculos a Vector Stores. Saltando.`);
            continue;
        }

        try {
            const result = await documentProcessingService.processAsset(
                asset.id,
                accountId,
                vsIds,
                { force: true }
            );
            console.log(`✅ Completado: ${JSON.stringify(result)}`);
        } catch (error: any) {
            console.error(`❌ Error procesando ${asset.name}:`, error.message);
        }
    }

    console.log('\n🏁 Fin del re-procesamiento masivo.');
    process.exit(0);
}

main().catch(console.error);
