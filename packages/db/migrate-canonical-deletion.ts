import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fluxcore');

async function migrate() {
  console.log('[Migration] Starting canonical deletion model migration...');

  // 1. Add redacted columns to messages
  await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS redacted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS redacted_by TEXT`;
  console.log('[Migration] Added redacted_at, redacted_by columns to messages');

  // 2. Drop old deleted columns
  await sql`ALTER TABLE messages DROP COLUMN IF EXISTS deleted_at`;
  await sql`ALTER TABLE messages DROP COLUMN IF EXISTS deleted_by`;
  await sql`ALTER TABLE messages DROP COLUMN IF EXISTS deleted_scope`;
  console.log('[Migration] Dropped deleted_at, deleted_by, deleted_scope columns from messages');

  // 3. Drop old CHECK constraint (may not exist, ignore error)
  try {
    await sql`ALTER TABLE messages DROP CONSTRAINT IF EXISTS message_deleted_scope_valid`;
    console.log('[Migration] Dropped message_deleted_scope_valid constraint');
  } catch (e) {
    console.log('[Migration] message_deleted_scope_valid constraint not found (OK)');
  }

  // 4. Create message_visibility table
  await sql`
    CREATE TABLE IF NOT EXISTS message_visibility (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      actor_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
      hidden_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('[Migration] Created message_visibility table');

  // 5. Create indexes
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS ux_message_visibility_message_actor ON message_visibility(message_id, actor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_message_visibility_actor ON message_visibility(actor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_message_visibility_message ON message_visibility(message_id)`;
  console.log('[Migration] Created indexes on message_visibility');

  await sql.end();
  console.log('[Migration] Canonical deletion model migration complete.');
}

migrate().catch((e) => {
  console.error('[Migration] FAILED:', e);
  process.exit(1);
});
