import { retrievalService } from '../services/retrieval.service';

async function main() {
    // Estos IDs son los que sabemos que contienen "Alto Palermo"
    const targetVsId = '48bebce0-a795-42df-9dc5-daf060b2d32b';
    const targetAccountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';
    
    console.log(`=== PRUEBA RAG AGNOSTICO: "Alto Palermo" ===`);
    console.log(`Buscando en VS: ${targetVsId}`);

    try {
        const result = await retrievalService.buildContext('Alto Palermo', [targetVsId], targetAccountId, {
            topK: 5,
            minScore: 0.1
        });

        console.log(`\nResultados encontrados: ${result.chunksUsed}`);
        if (result.chunksUsed > 0) {
            console.log("✅ EXITO: El motor agnóstico recuperó el barrio correctamente.");
            console.log("\nPrevisualización:");
            console.log(result.context.substring(0, 500));
        } else {
            console.error("❌ FALLO: Todavía no se recupera el barrio.");
        }
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
    }

    process.exit(0);
}

main().catch(console.error);
