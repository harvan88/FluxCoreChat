
import { db, fluxcoreVectorStores } from '@fluxcore/db';
import { eq, inArray } from 'drizzle-orm';

// IDs identificados en la auditoría como inexistentes en OpenAI
const GHOST_IDS = [
    'vs_697285347be88191a42837f4ee5341b6',
    'vs_6973de3e8b8c81918d0d266956a2bfc7'
];

async function main() {
    console.log(`🧹 Eliminando ${GHOST_IDS.length} Vector Stores fantasmas locales...`);

    const result = await db.delete(fluxcoreVectorStores)
        .where(inArray(fluxcoreVectorStores.externalId, GHOST_IDS))
        .returning();

    console.log(`✅ Eliminados: ${result.length}`);
    result.forEach(r => console.log(`   - ${r.name} (${r.id})`));

    process.exit(0);
}

main().catch(console.error);
