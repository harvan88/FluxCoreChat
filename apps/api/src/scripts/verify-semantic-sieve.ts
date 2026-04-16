import { templateSemanticService } from '../services/fluxcore/template-semantic.service';

/**
 * Test de Tamiz Semántico NATIVO
 * 
 * Verifica que el sistema puede recuperar las plantillas correctas
 * usando la infraestructura centralizada de FluxCore.
 */

const ACCOUNT_ID = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno

async function test() {
    console.log(`\n🔍 PROBANDO TAMIZ SEMÁNTICO (Aguas Arriba)`);
    console.log(`----------------------------------------`);

    const queries = [
        "Hola, tengo cucarachas en la cocina, son chiquitas y amarillas",
        "Presupuesto para fumigación de abejas",
        "Tengo ratas en el techo",
        "No tengo ninguna plaga, solo quiero saludar"
    ];

    for (const query of queries) {
        console.log(`\n❓ Query: "${query}"`);
        
        const startTime = Date.now();
        const relevantIds = await templateSemanticService.searchRelevantTemplateIds(query, ACCOUNT_ID, 5);
        const duration = Date.now() - startTime;

        console.log(`⏱️ Tiempo: ${duration}ms`);
        console.log(`✅ Plantillas Sugeridas (${relevantIds.length}):`);
        
        if (relevantIds.length === 0) {
            console.log("   (Ninguna relevante)");
        } else {
            relevantIds.forEach((id, i) => {
                console.log(`   ${i+1}. ${id}`);
            });
        }
    }

    console.log(`\n✨ TEST COMPLETADO.`);
    process.exit(0);
}

test().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
