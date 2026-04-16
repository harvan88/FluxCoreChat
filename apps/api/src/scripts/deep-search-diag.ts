import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';

const ACCOUNT_ID = '2fef52df-7262-46c5-96ba-7fd22eea188c';
const VS_ID = 'b6269a3a-a1f7-4bb2-8bcb-1e91b280321d';

async function test() {
    console.log("--- TEST 1: Solo VS_ID + AccountID ---");
    const r1 = await db.select({ count: sql`count(*)` }).from(fluxcoreDocumentChunks).where(and(
        eq(fluxcoreDocumentChunks.vectorStoreId, VS_ID),
        eq(fluxcoreDocumentChunks.accountId, ACCOUNT_ID)
    ));
    console.log("Result 1:", r1[0]);

    console.log("\n--- TEST 2: + Dims Check ---");
    const r2 = await db.select({ count: sql`count(*)` }).from(fluxcoreDocumentChunks).where(and(
        eq(fluxcoreDocumentChunks.vectorStoreId, VS_ID),
        eq(fluxcoreDocumentChunks.accountId, ACCOUNT_ID),
        sql`vector_dims(embedding) = 384`
    ));
    console.log("Result 2:", r2[0]);

    console.log("\n--- TEST 3: + Metadata Status Check (->>) ---");
    const r3 = await db.select({ count: sql`count(*)` }).from(fluxcoreDocumentChunks).where(and(
        eq(fluxcoreDocumentChunks.vectorStoreId, VS_ID),
        eq(fluxcoreDocumentChunks.accountId, ACCOUNT_ID),
        sql`metadata->>'status' = 'active'`
    ));
    console.log("Result 3:", r3[0]);

    console.log("\n--- TEST 4: Ver Metadatos de un registro ---");
    const r4 = await db.select({ m: fluxcoreDocumentChunks.metadata }).from(fluxcoreDocumentChunks).where(and(
        eq(fluxcoreDocumentChunks.vectorStoreId, VS_ID)
    )).limit(1);
    console.log("Metadata sample:", JSON.stringify(r4[0]?.m));
    console.log("Keys found:", r4[0]?.m ? Object.keys(r4[0].m) : "NOTHING");

    process.exit(0);
}

test().catch(console.error);
