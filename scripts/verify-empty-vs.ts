import { db, fluxcoreVectorStoreFiles, fluxcoreDocumentChunks, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function verifyEmptyVS() {
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    const aiAccountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    
    console.log(`\n🔍 AUDITORÍA FÍSICA - Vector Store: ${vsId}`);
    console.log(`👤 Cuenta de la IA: ${aiAccountId}`);
    console.log('════════════════════════════════════════════════════════════');

    try {
        // 1. Contar archivos vinculados al VS
        const links = await db.select().from(fluxcoreVectorStoreFiles).where(eq(fluxcoreVectorStoreFiles.vectorStoreId, vsId));
        console.log(`📁 Archivos vinculados al VS (fluxcore_vector_store_files): ${links.length}`);

        // 2. Contar chunks de vectores de la CUENTA de la IA
        // Si borramos los assets, sus chunks (que tienen CASCADE DELETE) deben haber desaparecido.
        const chunks = await db.select().from(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.accountId, aiAccountId));
        console.log(`🧠 Chunks totales de la cuenta de la IA: ${chunks.length}`);

        if (chunks.length > 0) {
            console.log('⚠️ ADVERTENCIA: Aún quedan chunks para esta cuenta.');
        } else {
            console.log('✅ LIMPIEZA TOTAL: No quedan vectores en la cuenta de la IA.');
        }

        console.log('\n✅ Auditoría completada.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la auditoría:', error);
        process.exit(1);
    }
}

verifyEmptyVS();
