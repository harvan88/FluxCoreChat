import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    console.log('--- PRUEBA DE FUEGO: SOVEREIGN ASSET SHIELD ---');
    const pool = postgres('postgresql://postgres:postgres@127.0.0.1:5432/fluxcore');
    const db = drizzle(pool);

    try {
        // Insert dummy asset
        const dummyId = uuidv4();
        const accountId = uuidv4();
        await db.execute(sql.raw(`
            INSERT INTO assets (id, account_id, name, storage_key, status)
            VALUES ('${dummyId}', '${accountId}', 'dummy', 'dummy_key', 'deleted')
        `));

        console.log('Intentando ejecutar dinamita: DELETE FROM assets...');
        await db.execute(sql.raw('DELETE FROM assets WHERE id = \'' + dummyId + '\';'));
        console.error('❌ FALLA DE SEGURIDAD: El borrado físico fue permitido.');
    } catch (e: any) {
        if (e.message.includes('SOVEREIGN_SHIELD')) {
            console.log('✅ ÉXITO: El escudo bloqueó la explosión exitosamente.');
            console.log('Mensaje del Escudo:', e.message);
        } else {
            console.error('❌ Error inesperado:', e);
        }
    } finally {
        await pool.end();
    }
    process.exit(0);
}

main().catch(console.error);
