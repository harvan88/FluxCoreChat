/**
 * Drop the remaining HNSW index that enforces fixed dimensions.
 */
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function fixIndex() {
    console.log('🔄 Dropping HNSW index that enforces fixed dimensions...\n');

    // Drop the HNSW index
    console.log('  ▶️ DROP INDEX idx_fluxcore_document_chunks_embedding...');
    try {
        await db.execute(sql`DROP INDEX IF EXISTS idx_fluxcore_document_chunks_embedding`);
        console.log('  ✅ Dropped!');
    } catch (e: any) {
        console.log(`  ❌ ${e.message}`);
    }

    // Verify no more HNSW embedding indexes remain
    const indexes = await db.execute(sql`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'fluxcore_document_chunks'
        AND indexdef LIKE '%embedding%'
    `);
    const rows = Array.isArray(indexes) ? indexes : [];
    console.log(`\n  Remaining embedding indexes: ${rows.length}`);
    for (const r of rows) {
        console.log(`    ${(r as any).indexname}: ${(r as any).indexdef}`);
    }

    // Test UPDATE with 1536-dim vector
    console.log('\n  ▶️ Test UPDATE with 1536-dim vector...');
    try {
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
            console.log('  ✅ UPDATE with 1536-dim SUCCEEDED!');
            
            // Restore
            const origVec = Array(384).fill(0.01).join(',');
            await db.execute(sql`
                UPDATE fluxcore_document_chunks
                SET embedding = ${sql.raw(`'[${origVec}]'::vector`)}
                WHERE id = ${id}::uuid
            `);
            console.log('  ✅ Restored to 384-dim');
        }
    } catch (e: any) {
        console.log(`  ❌ UPDATE still failing: ${e.message}`);
    }

    console.log('\n✅ Done!');
    process.exit(0);
}

fixIndex().catch(err => { console.error(err); process.exit(1); });
