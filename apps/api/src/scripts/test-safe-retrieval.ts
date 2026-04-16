import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    const query = 'Guayaquil';
    const queryEmbeddingLength = 1536; // Simulating OpenAI query
    const embeddingStr = '[' + new Array(1536).fill(0).join(',') + ']';
    
    const sanitizedKeyword = query.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]/g, '').trim();
    const keywordPattern = `%${sanitizedKeyword}%`;

    const vsId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549'; // This VS has 384-dim chunks

    console.log(`=== TESTING SAFE SIMILARITY QUERY ===`);
    
    try {
        const result = await db.execute(sql`
          SELECT 
            id, 
            content,
            CASE 
                WHEN vector_dims(c.embedding) = ${queryEmbeddingLength} 
                THEN 1 - (c.embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)})
                ELSE 0.5 -- Default for Keyword hits with dim mismatch
            END as similarity
          FROM fluxcore_document_chunks c
          WHERE vector_store_id = ${vsId}::uuid
            AND (
                (vector_dims(c.embedding) = ${queryEmbeddingLength} AND 1 - (c.embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) >= 0.1)
                OR c.content ILIKE ${sql.raw(`'${keywordPattern}'`)}
            )
        `);
        
        console.log(`Results: ${result.length}`);
        for (const r of result) {
            console.log(`- Match: ${r.content.substring(0, 50)} | Similarity: ${r.similarity}`);
        }
    } catch (e: any) {
        console.error(`❌ CRASHED: ${e.message}`);
    }
    
    process.exit(0);
}

main().catch(console.error);
