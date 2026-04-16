import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';

const ACCOUNT_ID = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno
const VS_ID = 'b6269a3a-a1f7-4bb2-8bcb-1e91b280321d'; // SYSTEM_INTERNAL_TEMPLATES

async function diagnose() {
    console.log(`\n🔍 DIAGNÓSTICO PROFUNDO DE BÚSQUEDA`);
    console.log(`----------------------------------------`);

    // 1. Contar chunks por VS y Cuenta
    const [count] = await db.select({ count: sql<number>`count(*)` })
        .from(fluxcoreDocumentChunks)
        .where(and(
            eq(fluxcoreDocumentChunks.vectorStoreId, VS_ID),
            eq(fluxcoreDocumentChunks.accountId, ACCOUNT_ID)
        ));
    console.log(`📊 Chunks en VS ${VS_ID}: ${count.count}`);

    // 2. Probar filtro de metadata
    const [activeCount] = await db.select({ count: sql<number>`count(*)` })
        .from(fluxcoreDocumentChunks)
        .where(and(
            eq(fluxcoreDocumentChunks.vectorStoreId, VS_ID),
            sql`metadata->>'status' = 'active'`
        ));
    console.log(`📊 Chunks con status 'active': ${activeCount.count}`);

    // 3. Probar filtro de dimensiones
    const [dimCount] = await db.select({ count: sql<number>`count(*)` })
        .from(fluxcoreDocumentChunks)
        .where(and(
            eq(fluxcoreDocumentChunks.vectorStoreId, VS_ID),
            sql`vector_dims(embedding) = 384`
        ));
    console.log(`📊 Chunks con dims = 384: ${dimCount.count}`);

    process.exit(0);
}

diagnose().catch(console.error);
