
import { db, sql } from '@fluxcore/db';

async function globalSearch() {
    console.log('--- BUSCANDO "Estado operativo" EN TODA LA DB ---');
    
    const tables = [
        'fluxcore_instruction_versions',
        'fluxcore_template_versions',
        'accounts',
        'account_locations',
        'fluxcore_assistants'
    ];

    for (const table of tables) {
        try {
            const query = `SELECT * FROM ${table} WHERE CAST(content AS TEXT) LIKE '%Estado operativo%' OR CAST(address AS TEXT) LIKE '%Estado operativo%' OR CAST(private_context AS TEXT) LIKE '%Estado operativo%'`;
            // Nota: Usamos una aproximación bruta ya que no sabemos el nombre exacto de la columna en cada tabla
            const res = await db.execute(sql.raw(`
                SELECT * FROM ${table} 
                WHERE (description::text ILIKE '%Estado operativo%')
                   OR (content::text ILIKE '%Estado operativo%')
                   OR (address::text ILIKE '%Estado operativo%')
                   OR (private_context::text ILIKE '%Estado operativo%')
            `)) as any;
            
            if (res.length > 0) {
                console.log(`\n!!! ENCONTRADO EN TABLA: ${table} (${res.length} filas)`);
                res.forEach((row: any, i: number) => {
                    console.log(`  [Fila ${i}] ID: ${row.id}`);
                    // Intentar mostrar dónde está
                    Object.entries(row).forEach(([key, val]) => {
                        if (typeof val === 'string' && val.includes('Estado operativo')) {
                            console.log(`    Columna: ${key}`);
                            console.log(`    Snippet: ${val.substring(val.indexOf('Estado operativo'), val.indexOf('Estado operativo') + 100)}`);
                        }
                    });
                });
            }
        } catch (e) {
            // Ignorar tablas que no tienen las columnas
        }
    }

    process.exit(0);
}

globalSearch().catch(console.error);
