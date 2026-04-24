import { db } from '../index';
import { sql } from 'drizzle-orm';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    
    // Ver los metadatos RAW de los chunks
    const chunks = await db.execute(sql`
        SELECT id, file_id, metadata, pg_typeof(metadata) as meta_type, embedding IS NOT NULL as has_vec
        FROM fluxcore_document_chunks 
        WHERE account_id = ${accountId}::uuid 
        AND embedding IS NOT NULL
        LIMIT 5
    `);
    
    console.log('--- RAW METADATA INSPECTION ---');
    chunks.forEach((c: any) => {
        console.log(`ID: ${c.id}`);
        console.log(`  file_id: ${c.file_id}`);
        console.log(`  meta_type: ${c.meta_type}`);
        console.log(`  has_vec: ${c.has_vec}`);
        console.log(`  metadata RAW: ${JSON.stringify(c.metadata)}`);
        console.log(`  typeof metadata: ${typeof c.metadata}`);
        console.log('');
    });

    // Probar diferentes formas de filtrar
    const test1 = await db.execute(sql`SELECT COUNT(*) as c FROM fluxcore_document_chunks WHERE account_id = ${accountId}::uuid AND embedding IS NOT NULL`);
    const test2 = await db.execute(sql`SELECT COUNT(*) as c FROM fluxcore_document_chunks WHERE account_id = ${accountId}::uuid AND metadata::text LIKE '%template%'`);
    const test3 = await db.execute(sql`SELECT COUNT(*) as c FROM fluxcore_document_chunks WHERE account_id = ${accountId}::uuid AND metadata::jsonb->>'type' = 'template'`);
    const test4 = await db.execute(sql`SELECT COUNT(*) as c FROM fluxcore_document_chunks WHERE account_id = ${accountId}::uuid AND metadata->>'type' = 'template'`);
    
    console.log('--- FILTER TESTS ---');
    console.log(`Con vector: ${test1[0].c}`);
    console.log(`LIKE template: ${test2[0].c}`);
    console.log(`::jsonb->>type: ${test3[0].c}`);
    console.log(`->>type: ${test4[0].c}`);

    process.exit(0);
}

main().catch(console.error);
