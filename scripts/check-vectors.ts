import { db, fluxcoreDocumentChunks, templates } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';

const ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';

async function main() {
    console.log(`\n🔍 AUDITANDO REPRESENTACIÓN VECTORIAL DE PLANTILLAS`);
    console.log(`Account: ${ACCOUNT_ID}`);
    console.log(`--------------------------------------------------`);

    try {
        const tCount = await db.select({ 
            id: templates.id,
            name: templates.name,
            content: templates.content,
            category: templates.category
        })
            .from(templates)
            .where(eq(templates.accountId, ACCOUNT_ID));

        console.log(`Core Templates Found: ${tCount.length}`);
        tCount.forEach(t => {
            console.log(`  - [CORE] Name: "${t.name}" | Cat: ${t.category}`);
        });

        const results = await db.select({
            id: fluxcoreDocumentChunks.id,
            fileId: fluxcoreDocumentChunks.fileId,
            content: fluxcoreDocumentChunks.content,
            metadata: fluxcoreDocumentChunks.metadata,
            hasEmbedding: sql<boolean>`embedding IS NOT NULL`
        })
        .from(fluxcoreDocumentChunks)
        .where(and(
            eq(fluxcoreDocumentChunks.accountId, ACCOUNT_ID),
            sql`metadata->>'type' = 'template'`
        ));

        if (results.length === 0) {
            console.log('⚠️ No se encontraron vectores de plantillas para esta cuenta.');
        } else {
            console.log(`✅ Se encontraron ${results.length} vectores de plantillas:`);
            results.forEach(r => {
                const meta = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) as any;
                console.log(`  - [${r.fileId}] Embebido: ${r.hasEmbedding ? 'SÍ' : 'NO'} | Snippet: "${r.content?.substring(0, 50)}..."`);
            });
        }
    } catch (err: any) {
        console.error('❌ Error durante la auditoría:', err.message);
    }
}

main().catch(console.error);
