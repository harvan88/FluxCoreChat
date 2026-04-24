
import { db } from '../index';
import { fluxcoreVectorStores } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    console.log(`--- CONFIGURACIÓN RAG PARA VS: ${vsId} ---`);

    const [vs] = await db.select().from(fluxcoreVectorStores)
        .where(eq(fluxcoreVectorStores.id, vsId));

    if (!vs) {
        console.log('No se encontró el Vector Store.');
    } else {
        console.log('Configuración:', JSON.stringify(vs.config, null, 2));
    }

    process.exit(0);
}

main().catch(console.error);
