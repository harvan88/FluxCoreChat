import { db } from '../connection';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding columns to templates table...');
  try {
    await db.execute(sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS trigger_keyword VARCHAR(255)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_templates_trigger ON templates (account_id, trigger_keyword)`);
    console.log('Columns and index added successfully.');
  } catch (error) {
    console.error('Error adding columns:', error);
  }
  process.exit(0);
}

main();
