import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('--- APLICANDO MIGRACIÓN DE SOBERANÍA ---');
    // Forzando IPv4
    const pool = postgres('postgresql://postgres:postgres@127.0.0.1:5432/fluxcore');
    const db = drizzle(pool);

    const sqlContent = readFileSync(join(process.cwd(), 'packages/db/migrations/052_sovereign_asset_shield.sql'), 'utf-8');
    
    try {
        await db.execute(sql.raw(sqlContent));
        console.log('✅ Trigger de protección aplicado correctamente.');
    } catch (e) {
        console.error('❌ Error aplicando trigger:', e);
    } finally {
        await pool.end();
    }
    process.exit(0);
}

main().catch(console.error);
