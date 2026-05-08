import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fluxcore';
const sql = postgres(connectionString);

async function runMigration() {
  console.log('🚀 Starting Phase 3 Manual Migration...');

  try {
    // 1. Update accounts table
    console.log('📝 Updating accounts table...');
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS country varchar(2)`;
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS timezone varchar(50)`;

    // 2. Update locations table
    console.log('📝 Updating locations table...');
    await sql`ALTER TABLE account_locations DROP COLUMN IF EXISTS timezone`;

    // 3. Create schedules tables
    console.log('📝 Creating schedules tables...');
    
    // Weekly Schedules
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_schedules (
        owner_type varchar(30) NOT NULL,
        owner_id uuid NOT NULL,
        day_of_week integer NOT NULL,
        is_closed boolean NOT NULL DEFAULT false,
        PRIMARY KEY (owner_type, owner_id, day_of_week)
      )
    `;

    // Weekly Intervals
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_intervals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_type varchar(30) NOT NULL,
        owner_id uuid NOT NULL,
        day_of_week integer NOT NULL,
        open_time time NOT NULL,
        close_time time NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_intervals_lookup ON weekly_intervals (owner_type, owner_id, day_of_week, open_time)`;

    // Special Dates
    await sql`
      CREATE TABLE IF NOT EXISTS special_dates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_type varchar(30) NOT NULL,
        owner_id uuid NOT NULL,
        date date NOT NULL,
        is_closed boolean NOT NULL DEFAULT true,
        label varchar(100),
        UNIQUE (owner_type, owner_id, date)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_special_dates_lookup ON special_dates (owner_type, owner_id, date)`;

    // Special Intervals
    await sql`
      CREATE TABLE IF NOT EXISTS special_intervals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        special_date_id uuid NOT NULL REFERENCES special_dates(id) ON DELETE CASCADE,
        open_time time NOT NULL,
        close_time time NOT NULL
      )
    `;

    console.log('✅ Phase 3 Manual Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

runMigration();
