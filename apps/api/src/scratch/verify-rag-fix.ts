import { db, fluxcoreVectorStores } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { retrievalService } from '../services/retrieval.service';

async function main() {
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ruben (Ragno)
    const query = 'cucaracha alemana';
    
    // 1. Obtener el Vector Store ID de Ragno
    const vss = await db.select().from(fluxcoreVectorStores)
        .where(eq(fluxcoreVectorStores.accountId, accountId))
        .limit(1);
    
    if (vss.length === 0) {
        console.error("No se encontraron Vector Stores para esta cuenta.");
        return;
    }
    
    const vsId = vss[0].id;
    console.log(`--- Verificando RAG para Ragno ---`);
    console.log(`Account ID: ${accountId}`);
    console.log(`Vector Store: ${vss[0].name} (${vsId})`);
    console.log(`Query: "${query}"`);
    
    // 2. Simular búsqueda pública
    const result = await retrievalService.search(
        query,
        [vsId],
        accountId,
        { topK: 5, minScore: 0.2 }
    );
    
    console.log(`\nResultados encontrados: ${result.chunks.length}`);
    
    if (result.chunks.length === 0) {
        console.error("❌ ERROR: No se encontraron resultados. Verificá si el script de sync falló.");
        return;
    }
    
    result.chunks.forEach((res, i) => {
        console.log(`[${i+1}] Score: ${res.similarity.toFixed(4)}`);
        console.log(`Contenido: ${res.content.substring(0, 100)}...`);
        
        const content = res.content.toLowerCase();
        if (content.includes('blattella') || content.includes('alemana') || content.includes('germanica')) {
            console.log("✅ MATCH CORRECTO: Se encontró la cucaracha alemana.");
        } else if (content.includes('murciélago') || content.includes('garrapata')) {
            console.log("❌ MATCH INCORRECTO: Sigue trayendo ruido (murciélagos/garrapatas).");
        }
    });
}

main().catch(console.error);
