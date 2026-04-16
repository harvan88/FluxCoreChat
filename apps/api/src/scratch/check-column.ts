import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function checkColumn() {
    // Check actual column type
    const result = await db.execute(sql`
        SELECT 
            column_name,
            udt_name,
            character_maximum_length,
            data_type
        FROM information_schema.columns 
        WHERE table_name = 'fluxcore_document_chunks' 
        AND column_name = 'embedding'
    `);
    const rows = Array.isArray(result) ? result : [];
    console.log('Column info:', JSON.stringify(rows, null, 2));
    
    // Check if there's an index that requires fixed dimensions
    const indexes = await db.execute(sql`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'fluxcore_document_chunks'
        AND indexdef LIKE '%embedding%'
    `);
    const idxRows = Array.isArray(indexes) ? indexes : [];
    console.log('\nEmbedding indexes:', JSON.stringify(idxRows, null, 2));
    
    // Test: Try inserting a 1536-dim vector directly
    console.log('\nTest UPDATE with 1536-dim vector...');
    try {
        // Find any chunk to test with
        const chunk = await db.execute(sql`
            SELECT id FROM fluxcore_document_chunks LIMIT 1
        `);
        const chunkRows = Array.isArray(chunk) ? chunk : [];
        if (chunkRows.length > 0) {
            const id = (chunkRows[0] as any).id;
            const testVec = Array(1536).fill(0.01).join(',');
            await db.execute(sql`
                UPDATE fluxcore_document_chunks
                SET embedding = ${sql.raw(`'[${testVec}]'::vector`)}
                WHERE id = ${id}::uuid
            `);
            console.log('  ✅ UPDATE with 1536-dim succeeded!');
            
            // Restore original (384-dim)
            const origVec = Array(384).fill(0.01).join(',');
            await db.execute(sql`
                UPDATE fluxcore_document_chunks
                SET embedding = ${sql.raw(`'[${origVec}]'::vector`)}
                WHERE id = ${id}::uuid
            `);
            console.log('  ✅ Restored to 384-dim');
        }
    } catch (e: any) {
        console.log(`  ❌ UPDATE failed: ${e.message}`);
    }

    process.exit(0);
}

checkColumn().catch(err => { console.error(err); process.exit(1); });
