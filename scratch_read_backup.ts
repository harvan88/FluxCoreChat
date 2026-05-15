
import { readFileSync } from 'node:fs';

async function readSqlBackup() {
    console.log('--- LEYENDO SQL BACKUP (UTF-8) ---');
    try {
        const filePath = 'c:\\Users\\harva\\Documents\\Trabajos\\meetgar\\FluxCoreChat\\FluxCoreChat\\pre_migration_backup.sql';
        const content = readFileSync(filePath, { encoding: 'utf8' });
        
        const lines = content.split('\n');
        console.log(`Buscando en ${lines.length} líneas...`);
        
        lines.forEach((line, i) => {
            if (line.includes('Estado operativo')) {
                console.log(`\n!!! ENCONTRADO EN LÍNEA ${i + 1}:`);
                console.log(line.substring(0, 1000));
            }
        });
    } catch (e) {
        // Reintentar con latin1 si falla
        const content = readFileSync(filePath, { encoding: 'latin1' });
        const lines = content.split('\n');
        console.log(`Buscando con latin1 en ${lines.length} líneas...`);
        lines.forEach((line, i) => {
            if (line.includes('Estado operativo')) {
                console.log(`\n!!! ENCONTRADO EN LÍNEA ${i + 1} (latin1):`);
                console.log(line.substring(0, 1000));
            }
        });
    }
    process.exit(0);
}

readSqlBackup().catch(console.error);
