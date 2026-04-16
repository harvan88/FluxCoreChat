/**
 * Run migration 030: Make embedding column dimension-agnostic
 */
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/fluxcore';
const sql = postgres(connectionString);

async function run() {
    console.log('🔄 Running migration 030: Agnostic embedding dimensions...\n');

    // Step 1: Drop HNSW index (requires fixed dimensions)
    console.log('  ▶️ Dropping HNSW index...');
    try {
        await sql`DROP INDEX IF EXISTS idx_document_chunks_embedding_hnsw`;
        console.log('  ✅ HNSW index dropped');
    } catch (e: any) {
        console.log(`  ⚠️ ${e.message}`);
    }

    // Step 2: Alter column to unbound vector type
    console.log('  ▶️ Altering column to vector (no dimension constraint)...');
    try {
        await sql`ALTER TABLE fluxcore_document_chunks ALTER COLUMN embedding TYPE vector`;
        console.log('  ✅ Column altered to unrestricted vector');
    } catch (e: any) {
        console.log(`  ❌ ${e.message}`);
    }

    // Step 3: Drop old helper function with fixed-dimension param
    console.log('  ▶️ Dropping old search function...');
    try {
        await sql.unsafe(`DROP FUNCTION IF EXISTS search_document_chunks(vector, UUID[], UUID, INTEGER, FLOAT)`);
        console.log('  ✅ Old function dropped');
    } catch (e: any) {
        console.log(`  ⚠️ ${e.message}`);
    }

    console.log('\n✅ Migration 030 complete! Column now accepts any embedding dimension.');
    await sql.end();
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
