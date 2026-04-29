import { db, fluxcoreDocumentChunks, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function inspectResidualChunks() {
    const aiAccountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    
    console.log(`\n🔍 INSPECCIÓN DE CHUNKS RESIDUALES - Cuenta: ${aiAccountId}`);
    console.log('════════════════════════════════════════════════════════════');

    try {
        const chunks = await db.select().from(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.accountId, aiAccountId));
        
        for (const chunk of chunks) {
            const asset = await db.select().from(assets).where(eq(assets.id, chunk.fileId)).limit(1);
            console.log(`🧩 Chunk ID: ${chunk.id}`);
            console.log(`   📄 File ID: ${chunk.fileId} (${asset[0]?.name || 'ASSET NO ENCONTRADO'})`);
            console.log(`   📝 Contenido: ${chunk.content.substring(0, 100)}...`);
            console.log('---');
        }

        console.log(`\nTotal: ${chunks.length} chunks residuales.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

inspectResidualChunks();
