
import { db } from '../index';
import { assets, fluxcoreFiles } from '../schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
    const fileName = 'precios de tratamientos.md';
    console.log(`--- CONTENIDO DE: ${fileName} ---`);

    const [file] = await db.select().from(fluxcoreFiles)
        .where(eq(fluxcoreFiles.name, fileName))
        .orderBy(desc(fluxcoreFiles.createdAt))
        .limit(1);

    if (!file) {
        console.log('No se encontró el archivo.');
    } else {
        console.log(`ID: ${file.id}`);
        console.log(`Contenido (primeros 500 caracteres):\n`);
        console.log(file.textContent?.substring(0, 500));
    }

    process.exit(0);
}

main().catch(console.error);
