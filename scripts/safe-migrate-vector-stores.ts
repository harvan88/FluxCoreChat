import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Starting safe vector store migration');
  
  // 1. Add source column with default
  await db.execute(sql`
    ALTER TABLE fluxcore_vector_stores
    ADD COLUMN IF NOT EXISTS source VARCHAR(10) NOT NULL DEFAULT 'primary';
  `);
  
  // 2. Update existing OpenAI stores
  await db.execute(sql`
    UPDATE fluxcore_vector_stores
    SET source = 'cache'
    WHERE backend = 'openai' AND source = 'primary';
  `);
  
  // 3. Verify changes
  const openaiStores = await db.execute(sql`
    SELECT COUNT(*) as count FROM fluxcore_vector_stores
    WHERE backend = 'openai' AND source = 'cache';
  `);
  
  const count = openaiStores.rows[0]?.count || 0;
  console.log(`Migrated ${count} OpenAI vector stores to cache`);
  console.log('Migration completed safely');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
