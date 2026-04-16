/**
 * Test: Search in the new OpenAI-embeddings vector store for "cucarachas"
 */
import { retrievalService } from '../services/retrieval.service';

async function testNewVS() {
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';
    const newVectorStoreId = '5ecafddb-d387-4219-ac58-005bd1352d84';

    const queries = ['cucarachas', 'cucaracha alemana', 'garrapatas'];

    for (const query of queries) {
        console.log(`\n--- Query: "${query}" (OpenAI embeddings) ---`);
        const result = await retrievalService.search(
            query,
            [newVectorStoreId],
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

        if (query === 'cucarachas') {
            const first = result.chunks[0];
            if (first && (first.content.toLowerCase().includes('cucaracha') || first.content.toLowerCase().includes('blattella'))) {
                console.log('  ✅ PASS: Cucaracha aparece primera');
            } else {
                console.log(`  ⚠️ First result: ${result.chunks[0]?.content.slice(0, 50) || 'none'}...`);
            }
        }
    }

    process.exit(0);
}

testNewVS().catch(err => { console.error(err); process.exit(1); });
