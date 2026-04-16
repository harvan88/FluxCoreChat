import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    const query = 'Guayaquil';
    const sanitizedKeyword = query.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]/g, '').trim();
    const keywordPattern = sanitizedKeyword.length > 2 ? `%${sanitizedKeyword}%` : 'NO_MATCH_XYZ';
    
    console.log(`=== TESTING ILIKE QUERY ON 9c25ae4f ===`);
    console.log(`Query: ${query}`);
    console.log(`Pattern: ${keywordPattern}`);

    const vsId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549';
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';

    const result = await db.execute(sql`
      SELECT id, content 
      FROM fluxcore_document_chunks 
      WHERE account_id = ${accountId}::uuid
        AND vector_store_id = ${vsId}::uuid
        AND content ILIKE ${sql.raw(`'${keywordPattern}'`)}
    `);
    
    console.log(`Results: ${result.length}`);
    for (const r of result) {
        console.log(`- Match: ${r.content.substring(0, 100)}...`);
    }
    
    process.exit(0);
}

main().catch(console.error);
