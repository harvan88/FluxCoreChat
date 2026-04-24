
import { db } from '../index';
import { assets, fluxcoreDocumentChunks } from '../schema';
import { eq, sql, desc } from 'drizzle-orm';
import { retrievalService } from '../../../../apps/api/src/services/retrieval.service';

async function verifyModelado() {
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    const query = "Modelado 360";
    console.log(`--- ESCANEO DE RECUPERACIÓN RAG: "${query}" ---`);

    // 1. Ver estado global de ingesta
    const [stats] = await db.select({ 
        assets: sql`count(distinct ${assets.id})`,
        chunks: sql`count(*)`
    }).from(fluxcoreDocumentChunks).leftJoin(assets, eq(fluxcoreDocumentChunks.fileId, assets.id));
    
    console.log(`📊 Inventario Actual: ${stats.assets} archivos indexados | ${stats.chunks} fragmentos totales.`);

    if (parseInt(stats.chunks as string) === 0) {
        console.error('❌ ERROR: No hay vectores en la base de datos. La ingesta falló o no ha terminado.');
        process.exit(1);
    }

    // 2. Ejecutar Búsqueda Semántica Real (con el servicio de producción)
    // Buscamos en todas las cuentas para asegurar que lo encontramos
    const [lastAsset] = await db.select().from(assets).orderBy(desc(assets.createdAt)).limit(1);
    if (!lastAsset) {
        console.error('❌ ERROR: No se encontró ningún Asset maestro.');
        process.exit(1);
    }

    console.log(`🔍 Buscando en cuenta: ${lastAsset.accountId} y Carpeta: ${vsId}...`);
    
    // El retrievalService hace la magia de los embeddings y el coseno de similitud
    const searchResult = await retrievalService.search(
        query,
        [vsId],
        lastAsset.accountId,
        {
            minScore: 0.01, // Umbral casi nulo para ver TODO
            topK: 10
        }
    );

    const results = searchResult.chunks;
    console.log(`🎯 Resultados encontrados: ${results.length}`);

    results.forEach((res, i) => {
        console.log(`\n[Resultado ${i + 1}] - Similitud: ${(res.similarity * 100).toFixed(2)}%`);
        console.log(`Fragmento ID: ${res.id}`);
        console.log(`Contenido: ${res.content.substring(0, 200)}...`);
    });

    if (results.length > 0) {
        console.log('\n🚀 ÉXITO: El motor ha recuperado "Modelado 360" con la nueva arquitectura.');
    } else {
        console.warn('\n⚠️ El motor no encontró coincidencias semánticas. Verifica que el contenido del archivo sea correcto.');
    }

    process.exit(0);
}

verifyModelado().catch(console.error);
