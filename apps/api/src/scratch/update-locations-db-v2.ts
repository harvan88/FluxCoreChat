import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function updateLocationsStructured() {
  console.log('🔄 Adding structured address fields to account_locations table...');
  
  try {
    await db.execute(sql`
      ALTER TABLE account_locations 
      ADD COLUMN IF NOT EXISTS country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
      ADD COLUMN IF NOT EXISTS street_address TEXT;
    `);
    
    console.log('✅ Structured address fields added successfully.');
  } catch (error) {
    console.error('❌ Error updating account_locations table:', error);
    process.exit(1);
  }
}

updateLocationsStructured();
