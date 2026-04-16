import { retrievalService } from '../services/retrieval.service';
import { db } from '../db';

async function testSimilarity() {
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';
    const query = 'cucarachas';
    const vectorStoreId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549';

    console.log(`--- Testing Similarity for query: "${query}" ---`);
    
    const results = await retrievalService.vectorSearch({
        accountId,
        vectorStoreId,
        query,
        topK: 10
    });

    results.forEach((r: any, i: number) => {
        console.log(`[${i+1}] Score: ${r.score.toFixed(4)} | Content: ${r.content.slice(0, 100)}...`);
    });
}

testSimilarity().catch(console.error);
