/**
 * Scratch script: Verifica que el fix de ILIKE + vector search 
 * retorna resultados correctos para "cucarachas" (genérico).
 */
import { retrievalService } from '../services/retrieval.service';

async function verifyRagFix() {
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';
    const vectorStoreId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549';

    const queries = ['cucarachas', 'cucaracha alemana', 'garrapatas'];

    for (const query of queries) {
        console.log(`\n--- Query: "${query}" ---`);
        const result = await retrievalService.search(
            query,
            [vectorStoreId],
            accountId,
            { topK: 5, minScore: 0.2 }
        );

        if (result.chunks.length === 0) {
            console.log('  ⚠️ No results found');
            continue;
        }

        for (const chunk of result.chunks) {
            const preview = chunk.content.slice(0, 80).replace(/\n/g, ' ');
            console.log(`  [${chunk.similarity.toFixed(4)}] ${preview}...`);
        }

        // Verificar que "cucarachas" NO trae comadreja como #1
        if (query === 'cucarachas') {
            const first = result.chunks[0];
            if (first && first.content.toLowerCase().includes('comadreja')) {
                console.log('  ❌ FAIL: Comadreja sigue apareciendo primera para "cucarachas"');
            } else if (first && (first.content.toLowerCase().includes('cucaracha') || first.content.toLowerCase().includes('blattella'))) {
                console.log('  ✅ PASS: Cucaracha aparece primera');
            } else {
                console.log(`  ⚠️ UNKNOWN: Primer resultado no es cucaracha ni comadreja`);
            }
        }
    }

    process.exit(0);
}

verifyRagFix().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
