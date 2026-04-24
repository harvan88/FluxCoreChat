import { db } from '../packages/db/src/connection';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        console.log('Inspeccionando función de trigger: recalculate_vs_stats');
        
        const result = await db.execute(sql`
            SELECT proname, prosrc 
            FROM pg_proc 
            WHERE proname = 'recalculate_vs_stats';
        `);

        console.log('\n--- CÓDIGO FUENTE DEL TRIGGER ---');
        console.log(result[0]?.prosrc || 'No se encontró la función');
        console.log('--------------------------------\n');

        // También mirar la tabla de estadísticas
        const stats = await db.execute(sql`
            SELECT * FROM fluxcore_vector_store_stats LIMIT 5;
        `);
        console.log('--- MUESTRA DE ESTADÍSTICAS ---');
        console.log(JSON.stringify(stats, null, 2));

        process.exit(0);
    } catch (e) {
        console.error('Error inspeccionando:', e);
        process.exit(1);
    }
}

main();
