
import { db } from '../index';
import { assets, fluxcoreVectorStoreFiles, fluxcoreDocumentChunks } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import { retrievalService } from '../../../../apps/api/src/services/retrieval.service';

async function forensicTest() {
    console.log('--- AUDITORÍA FORENSE RAG ASSET-CENTRIC ---');
    
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    const fileName = 'precios de tratamientos.md';

    // 1. Verificar ASSET (Barrido completo si falla el nombre exacto)
    let [asset] = await db.select().from(assets)
        .where(and(eq(assets.accountId, accountId), eq(assets.name, fileName)));
    
    if (!asset) {
        console.warn(`⚠️ No se encontró exacto por nombre "${fileName}". Listando alternativas...`);
        const allAssets = await db.select().from(assets).where(eq(assets.accountId, accountId));
        allAssets.forEach(a => console.log(` - Posible match: "${a.name}" (ID: ${a.id})`));
        asset = allAssets.find(a => a.name.toLowerCase().includes('precios')) || allAssets[0];
    }
    
    if (!asset) {
        console.error(`❌ ERROR: No hay Assets en la cuenta ${accountId}`);
        process.exit(1);
    }
    console.log(`✅ Usando Asset: ${asset.id} (${asset.name})`);

    // 2. Verificar Vínculo con Carpeta
    const [link] = await db.select().from(fluxcoreVectorStoreFiles)
        .where(and(eq(fluxcoreVectorStoreFiles.vectorStoreId, vsId), eq(fluxcoreVectorStoreFiles.fileId, asset.id)));
    
    if (!link) {
        console.error(`❌ ERROR: El Asset no está vinculado a la carpeta ${vsId}`);
        process.exit(1);
    }
    console.log(`✅ Vínculo Vector Store verificado: Carpeta "${vsId}"`);

    // 3. Verificar Vectores (Chunks)
    const chunks = await db.select().from(fluxcoreDocumentChunks)
        .where(eq(fluxcoreDocumentChunks.fileId, asset.id));
    
    console.log(`📊 Chunks encontrados en base de datos: ${chunks.length}`);
    if (chunks.length === 0) {
        console.warn(`⚠️ ADVERTENCIA: Hay 0 chunks. El archivo necesita ser re-procesado.`);
    }

    // 4. Prueba de Recuperación (Retrieval)
    console.log('\n--- PROBANDO MOTOR DE RECUPERACIÓN (RETRIEVAL) ---');
    const query = 'Modelado 360';
    try {
        const result = await retrievalService.search(query, [vsId], accountId, { topK: 3, minScore: 0.1 });
        console.log(`🔍 Query: "${query}"`);
        console.log(`🎯 Resultados encontrados: ${result.chunks.length}`);
        
        result.chunks.forEach((chunk, i) => {
            console.log(`\n[Resultado ${i+1}] - Similitud: ${(chunk.similarity * 100).toFixed(2)}%`);
            console.log(`Contenido: ${chunk.content.substring(0, 100)}...`);
        });
    } catch (err: any) {
        console.error(`❌ ERROR en Retrieval: ${err.message}`);
    }

    process.exit(0);
}

forensicTest().catch(console.error);
