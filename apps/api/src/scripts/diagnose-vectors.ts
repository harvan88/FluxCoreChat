import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, sql } from 'drizzle-orm';

const ACCOUNT_ID = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno

async function diagnose() {
    console.log(`\n🔍 DIAGNÓSTICO DE VECTORES PARA CUENTA: ${ACCOUNT_ID}`);

    const chunks = await db.select({
        id: fluxcoreDocumentChunks.id,
        content: fluxcoreDocumentChunks.content,
        metadata: fluxcoreDocumentChunks.metadata,
        hasVector: sql<boolean>`embedding IS NOT NULL`,
        vectorDims: sql<number>`vector_dims(embedding)`
    })
    .from(fluxcoreDocumentChunks)
    .where(eq(fluxcoreDocumentChunks.accountId, ACCOUNT_ID));

    console.log(`📊 Chunks encontrados: ${chunks.length}`);

    chunks.forEach((c, i) => {
        console.log(`\n[${i+1}] ID: ${c.id}`);
        console.log(`    Content: "${c.content?.substring(0, 50)}..."`);
        console.log(`    Metadata: ${JSON.stringify(c.metadata)}`);
        console.log(`    Has Vector: ${c.hasVector}`);
        console.log(`    Dims: ${c.vectorDims}`);
    });

    process.exit(0);
}

diagnose().catch(console.error);
