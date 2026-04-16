import { retrievalService } from '../services/retrieval.service';

async function testRetrieval(query: string, vsId: string, accountId: string) {
    console.log(`\n🔍 PROBANDO QUERY: "${query}"`);
    console.log(`----------------------------------------`);
    
    try {
        const result = await retrievalService.search(query, [vsId], accountId, {
            topK: 10,
            minScore: 0.1
        });

        console.log(`Chunks recuperados: ${result.chunks.length}`);
        
        result.chunks.forEach((chunk, i) => {
            console.log(`\n[${i + 1}] Similarity: ${chunk.similarity.toFixed(4)}`);
            // Mostrar si es hit de Keyword o Vectorial
            console.log(`Contenido: ${chunk.content.substring(0, 200)}...`);
        });

        if (result.chunks.length === 0) {
            console.log("⚠️ Sin resultados.");
        }
    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
    }
}

async function main() {
    const targetVsId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549';
    // ID Corregido basado en identificación de owner
    const targetAccountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';

    console.log(`=== BATERÍA DE PRUEBAS RAG MULTI-TÉRMINO (OWNER: ${targetAccountId}) ===`);
    console.log(`Vector Store: ${targetVsId}`);

    // Prueba 1: Solo Plaga (encontrará chunks de Blattella)
    await testRetrieval("Cucaracha", targetVsId, targetAccountId);

    // Prueba 2: Solo Barrio (encontrará el chunk del listado de barrios)
    await testRetrieval("Guayaquil", targetVsId, targetAccountId);

    // Prueba 3: Combinada (Debe traer AMBOS tipos de chunks en la misma respuesta)
    // Este es el "Holy Grail" que el usuario buscaba
    await testRetrieval("Cucaracha, Guayaquil", targetVsId, targetAccountId);

    process.exit(0);
}

main().catch(console.error);
