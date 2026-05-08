#!/usr/bin/env bun
/**
 * Migration: Create account_locations table
 */

import { db } from '../connection';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Creating account_locations table...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS account_locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(500) NOT NULL,
      city VARCHAR(100),
      state VARCHAR(100),
      country VARCHAR(100),
      postal_code VARCHAR(20),
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
      is_main BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('  ✅ account_locations table created');
  
  // Index for account_id
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_account_locations_account_id ON account_locations(account_id);
  `);
  console.log('  ✅ Index for account_id created');

  console.log('✨ Migration complete');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
