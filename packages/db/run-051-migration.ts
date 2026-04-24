import { sql } from 'drizzle-orm';
import { db } from './src/connection';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    console.log('Running 051 Asset-Centric RAG migration directly...');
    const sqlContent = fs.readFileSync(path.join(__dirname, 'migrations', '051_asset_centric_rag.sql'), 'utf-8');
    
    // We cannot use drizzle 'sql' template tag with standard string, so we use execute properly:
    // Drizzle exposes the underlying client. 
    // BUT we can also just use the sql raw
    await db.execute(sql.raw(sqlContent));
    
    console.log('Migration 051 applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
