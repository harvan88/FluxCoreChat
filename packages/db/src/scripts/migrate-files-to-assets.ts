
import { db } from '../index';
import { fluxcoreFiles, assets } from '../schema';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('--- MIGRANDO FILES A ASSETS PARA INTEGRIDAD RAG ---');
    
    const files = await db.select().from(fluxcoreFiles);
    console.log(`Encontrados ${files.length} archivos legacy.`);
    
    let migrated = 0;
    for (const file of files) {
        try {
            await db.insert(assets).values({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType || 'application/octet-stream',
                sizeBytes: Number(file.sizeBytes) || 0,
                accountId: file.accountId,
                storageKey: `legacy/${file.accountId}/${file.id}`, // Generamos una llave determinista
                metadata: {
                    contentHash: file.contentHash,
                    originalName: file.originalName,
                    source: 'legacy_migration'
                }
            }).onConflictDoNothing();
            migrated++;
        } catch (err: any) {
            console.error(`Error migrando archivo ${file.id}: ${err.message}`);
        }
    }
    
    console.log(`Migración completada. ${migrated} assets garantizados.`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
