
import { db, fluxcoreDocumentChunks } from '../index';
import { sql, eq } from 'drizzle-orm';

async function main() {
    const templateId = 'f3467c80-339c-4a0a-9ec6-cc06ca6a7be8';
    console.log(`--- INSPECCIÓN DE REGISTRO FANTASMA: ${templateId} ---`);

    const results = await db.select().from(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.fileId, templateId));

    console.log(`Encontrados ${results.length} registros para este ID.`);
    results.forEach((r: any) => {
        console.log(JSON.stringify({
            id: r.id,
            fileId: r.fileId,
            accountId: r.accountId,
            has_embedding: !!r.embedding,
            metadata: r.metadata,
            updatedAt: r.updatedAt
        }, null, 2));
    });

    process.exit(0);
}
main().catch(console.error);
