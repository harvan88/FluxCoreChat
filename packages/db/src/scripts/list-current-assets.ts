
import { db } from '../index';
import { assets } from '../schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    console.log(`--- ARCHIVOS INDEXADOS PARA DR. JONES (${accountId}) ---`);

    const currentAssets = await db.select().from(assets)
        .where(eq(assets.accountId, accountId))
        .orderBy(desc(assets.createdAt));

    currentAssets.forEach((a, i) => {
        console.log(`[${i + 1}] ID: ${a.id} | Nombre: ${a.name} | Creado: ${a.createdAt}`);
    });

    if (currentAssets.length === 0) {
        console.log('No se encontraron archivos en esta cuenta.');
    }

    process.exit(0);
}

main().catch(console.error);
