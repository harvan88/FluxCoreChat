
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/fluxcore';
const sql = postgres(connectionString);

async function run() {
    const migrationPath = path.resolve(process.cwd(), 'packages/db/migrations/020_scalability.sql');
    if (!fs.existsSync(migrationPath)) {
        console.error('Migration file not found at:', migrationPath);
        process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying 020_scalability.sql...');
    try {
        await sql.unsafe(migrationSql);
        console.log('✅ Scalability migration applied successfully');
    } catch (error: any) {
        console.error('❌ Failed to apply migration:', error.message);
    } finally {
        await sql.end();
    }
}

run().catch(console.error);
