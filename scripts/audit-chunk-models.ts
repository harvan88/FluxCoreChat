import { db, fluxcoreDocumentChunks, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function checkEmbeddingModels() {
    console.log(`\n🔍 AUDITORÍA DE "CALIDADES" (MODELOS DE EMBEDDING)`);
    console.log('════════════════════════════════════════════════════════════');

    try {
        const assetIdTreatments = '3b874e89-c62c-48b0-aa1b-0cb46a695efb'; // Tratamientos
        const assetIdBugs = 'eecfb86f-38d4-46a5-9236-61704365cee6'; // Catálogo de plagas

        const chunks = await db.select().from(fluxcoreDocumentChunks);
        
        const modelsBugs = new Set();
        const modelsTreatments = new Set();
        let dimsBug = 0, dimsTreatments = 0;

        for (const c of chunks) {
            if (c.fileId === assetIdBugs) {
                modelsBugs.add(c.embeddingModel);
                if (!dimsBug && c.embedding) dimsBug = c.embedding.length;
            }
            if (c.fileId === assetIdTreatments) {
                modelsTreatments.add(c.embeddingModel);
                if (!dimsTreatments && c.embedding) dimsTreatments = c.embedding.length;
            }
        }

        console.log(`\n🐛 CATÁLOGO DE PLAGAS:`);
        console.log(`   - Modelos detectados: ${Array.from(modelsBugs).join(', ')}`);
        console.log(`   - Dimensión física: ${dimsBug}d`);

        console.log(`\n💰 PRECIOS DE TRATAMIENTOS:`);
        console.log(`   - Modelos detectados: ${Array.from(modelsTreatments).join(', ')}`);
        console.log(`   - Dimensión física: ${dimsTreatments}d`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkEmbeddingModels();
