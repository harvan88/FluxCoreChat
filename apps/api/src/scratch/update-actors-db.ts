import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function updateActorsSchema() {
  console.log('🔄 Adding location fields to actors table...');
  
  try {
    await db.execute(sql`
      ALTER TABLE actors 
      ADD COLUMN IF NOT EXISTS last_lat REAL,
      ADD COLUMN IF NOT EXISTS last_lon REAL,
      ADD COLUMN IF NOT EXISTS last_address TEXT,
      ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMP;
    `);
    
    console.log('✅ Columns added successfully to actors table.');
  } catch (error) {
    console.error('❌ Error updating actors table:', error);
    process.exit(1);
  }
}

updateActorsSchema();
