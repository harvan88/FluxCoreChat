import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    const query = 'Alto Palermo';
    const sanitizedKeyword = query.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]/g, '').trim();
    const keywordPattern = sanitizedKeyword.length > 2 ? `%${sanitizedKeyword}%` : 'NO_MATCH_XYZ';
    
    console.log(`=== TESTING ILIKE QUERY ===`);
    console.log(`Query: ${query}`);
    console.log(`Pattern: ${keywordPattern}`);

    const vsId = '48bebce0-a795-42df-9dc5-daf060b2d32b';
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';

    const result = await db.execute(sql`
      SELECT id, content 
      FROM fluxcore_document_chunks 
      WHERE account_id = ${accountId}::uuid
        AND vector_store_id = ${vsId}::uuid
        AND content ILIKE ${sql.raw(`'${keywordPattern}'`)}
    `);
    
    console.log(`Results: ${result.length}`);
    if (result.length > 0) {
        console.log("Match found!");
    } else {
        console.log("No match found.");
    }
    
    process.exit(0);
}

main().catch(console.error);
