import postgres from 'postgres';

async function run() {
  const sql = postgres('postgres://postgres:postgres@localhost:5432/fluxcore');
  try {
    await sql`ALTER TABLE accounts ADD COLUMN ai_include_locations boolean DEFAULT true NOT NULL`;
    console.log('Migration applied');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('Column already exists');
    } else {
      console.error(e);
    }
  }
  process.exit(0);
}
run();
