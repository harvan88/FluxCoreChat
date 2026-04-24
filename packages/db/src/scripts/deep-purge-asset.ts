
import { db } from '../index';
import { assets, fluxcoreDocumentChunks } from '../schema';
import { eq, sql } from 'drizzle-orm';

async function deepPurge() {
    const assetId = '6a4641d5-5da0-490d-9d2e-bb8b6c744588';
    console.log(`--- INICIANDO PURGA PROFUNDA DE ASSET: ${assetId} ---`);

    // 1. Borrar el Asset
    const result = await db.delete(assets).where(eq(assets.id, assetId)).returning();
    
    if (result.length > 0) {
        console.log(`✅ Asset Maestro purgado físicamente: ${result[0].name}`);
    } else {
        console.warn('⚠️ El Asset ya no existe en la tabla maestra.');
    }

    // 2. Verificar Chunks (deberían ser 0 por CASCADE)
    const count = await db.select({ count: sql`count(*)` }).from(fluxcoreDocumentChunks)
        .where(eq(fluxcoreDocumentChunks.fileId, assetId));
    
    console.log(`📊 Chunks restantes en base de datos: ${count[0].count}`);
    
    if (count[0].count === '0' || count[0].count === 0) {
        console.log('🚀 ÉXITO: La purga en cascada ha sido verificada por código.');
    } else {
        console.error('❌ ERROR: Los chunks no se borraron. La integridad referencial falló.');
    }

    process.exit(0);
}

deepPurge().catch(console.error);
