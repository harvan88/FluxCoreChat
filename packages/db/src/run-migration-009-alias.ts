/**
 * COR-005: Añadir campo alias a accounts
 */
import { sql } from 'drizzle-orm';
import { db } from './index';

async function runMigration() {
  console.log('🔄 Running migration 009: Account Alias (COR-005)...\n');
  
  try {
    // Añadir columna alias
    await db.execute(sql`
      ALTER TABLE accounts 
      ADD COLUMN IF NOT EXISTS alias VARCHAR(100)
    `);
    console.log('✅ Columna alias añadida a accounts');

    // Añadir comentario
    await db.execute(sql`
      COMMENT ON COLUMN accounts.alias IS 'COR-005: Alias para identificación contextual en relaciones'
    `);
    console.log('✅ Comentario añadido');

    // Crear índice para búsquedas por alias
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_accounts_alias ON accounts(alias)
    `);
    console.log('✅ Índice idx_accounts_alias creado');

    console.log('\n✅ Migration 009: Account Alias completed!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
