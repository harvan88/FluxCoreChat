/**
 * Verifica qué score tiene específicamente el chunk de Blattella germanica.
 * Si el score es bajo incluso para "cucaracha", el embedding local no
 * tiene buena resolución para este dominio.
 */
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';
import { embeddingService } from '../services/embedding.service';
import { ragConfigService } from '../services/rag-config.service';

async function debugCucaracha() {
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';
    const vectorStoreId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549';
    
    // Get config
    const config = await ragConfigService.getEffectiveConfig(vectorStoreId, accountId);
    console.log(`Config: ${config.embedding.provider}/${config.embedding.model} (${config.embedding.dimensions} dims)`);
    console.log(`MinScore: ${config.retrieval.minScore}`);
    
    // Generate embedding for "cucarachas"
    const queries = ['cucarachas', 'cucaracha', 'cucaracha alemana', 'blattella germanica', 'plaga cucarachas cocina'];
    
    for (const q of queries) {
        const embed = await embeddingService.embedWithConfig(q, {
            provider: config.embedding.provider,
            model: config.embedding.model,
            dimensions: config.embedding.dimensions,
        });
        
        // Search only for cucaracha chunk
        const result = await db.execute(sql`
            SELECT 
                c.content,
                1 - (c.embedding <=> ${sql.raw(`'[${embed.embedding.join(',')}]'::vector`)}) as cosine_sim
            FROM fluxcore_document_chunks c
            WHERE c.account_id = ${accountId}::uuid
              AND c.vector_store_id = ${vectorStoreId}::uuid
              AND c.content ILIKE '%Blattella germanica%'
            LIMIT 1
        `);
        
        const rows = Array.isArray(result) ? result : [];
        if (rows.length > 0) {
            console.log(`\nQuery: "${q}" → Cucaracha alemana score: ${parseFloat((rows[0] as any).cosine_sim).toFixed(4)}`);
        }
    }
    
    process.exit(0);
}

debugCucaracha().catch(err => { console.error(err); process.exit(1); });
