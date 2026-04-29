import { db, fluxcoreDocumentChunks, assets } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function globalChunkAudit() {
    console.log(`\n🔍 AUDITORÍA GLOBAL DE CHUNKS (Últimos 100)`);
    console.log('════════════════════════════════════════════════════════════');

    try {
        const chunks = await db.select()
            .from(fluxcoreDocumentChunks)
            .orderBy(desc(fluxcoreDocumentChunks.createdAt))
            .limit(100);
        
        for (const chunk of chunks) {
            const asset = await db.select().from(assets).where(eq(assets.id, chunk.fileId)).limit(1);
            console.log(`🧩 ID: ${chunk.id} | Cuenta: ${chunk.accountId}`);
            console.log(`   📄 Archivo: ${asset[0]?.name || 'N/A'} (${chunk.fileId})`);
            console.log(`   📝 Texto: ${chunk.content.substring(0, 50)}...`);
            console.log('---');
        }

        console.log(`\nMostrados ${chunks.length} chunks.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

globalChunkAudit();
