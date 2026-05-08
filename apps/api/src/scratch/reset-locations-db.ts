import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function resetLocationsTable() {
  console.log('🔄 Resetting account_locations table to match Master Plan...');
  
  try {
    // Drop existing table
    await db.execute(sql`DROP TABLE IF EXISTS account_locations CASCADE;`);
    console.log('✅ Table dropped.');

    // Create table with Master Plan schema
    await db.execute(sql`
      CREATE TABLE account_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        lat REAL,
        lon REAL,
        service_type VARCHAR(20) DEFAULT 'both',
        coverage_radius_km REAL,
        phone VARCHAR(50),
        email VARCHAR(255),
        timezone VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        is_default BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    
    // Create indexes
    await db.execute(sql`CREATE INDEX idx_account_locations_account ON account_locations(account_id);`);
    await db.execute(sql`CREATE INDEX idx_account_locations_status ON account_locations(status);`);
    
    console.log('✅ Table created successfully with Master Plan schema.');
  } catch (error) {
    console.error('❌ Error resetting table:', error);
    process.exit(1);
  }
}

resetLocationsTable();
