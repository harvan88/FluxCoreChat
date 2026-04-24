
import { db } from '../index';
import { assets, fluxcoreVectorStoreFiles, fluxcoreFiles, fluxcoreDocumentChunks } from '../schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { embeddingService } from '../../../../apps/api/src/services/embedding.service';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    
    const filesToRestore = [
        {
            name: 'precios de tratamientos.md',
            path: 'docs/reconstruction-phase-1/temp/precios de tratamientos.md'
        }
    ];

    console.log(`--- RESTAURACIÓN DE EMERGENCIA V2 ---`);

    for (const fileDef of filesToRestore) {
        const fullPath = path.resolve(process.cwd(), fileDef.path);
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ No se encontró el archivo físico en: ${fullPath}`);
            continue;
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        console.log(`📄 Restaurando: ${fileDef.name}...`);

        // 1. Crear Asset Maestro
        const [asset] = await db.insert(assets).values({
            name: fileDef.name,
            accountId,
            type: 'text/markdown',
            size: content.length,
            storageKey: `restored/${Date.now()}-${fileDef.name}`,
            source: 'upload'
        }).returning();

        // 2. Crear Registro de Archivo
        await db.insert(fluxcoreFiles).values({
            id: asset.id,
            name: fileDef.name,
            accountId,
            textContent: content,
            mimeType: 'text/markdown',
            size: content.length
        });

        // 3. Vincular a Vector Store
        await db.insert(fluxcoreVectorStoreFiles).values({
            vectorStoreId: vsId,
            fileId: asset.id,
            accountId,
            status: 'completed'
        });

        // 4. LÓGICA DE PROCESAMIENTO ATÓMICA (Copiada del service blindado)
        console.log(`📡 Generando vectores atómicos para ${fileDef.name}...`);
        
        // Simular fragmentación simple (1 solo chunk para este test)
        const chunkText = content;
        const [embResult] = await Promise.all([
            embeddingService.embedWithConfig(chunkText, {
                provider: 'local',
                model: 'paraphrase-multilingual-MiniLM-L12-v2',
                dimensions: 384
            })
        ]);

        console.log(`✅ Vector generado (Dim: ${embResult.embedding.length}). Insertando...`);

        const [chunk] = await db.insert(fluxcoreDocumentChunks).values({
            fileId: asset.id,
            accountId,
            embeddingModel: 'paraphrase-multilingual-MiniLM-L12-v2',
            content: chunkText,
            chunkIndex: 0,
            tokenCount: Math.ceil(chunkText.length / 4),
            metadata: { documentTitle: fileDef.name }
        }).returning();

        const embeddingStr = `[${embResult.embedding.join(',')}]`;
        await db.execute(sql`
            UPDATE fluxcore_document_chunks
            SET embedding = ${sql.raw(`'${embeddingStr}'::vector`)}
            WHERE id = ${chunk.id}::uuid
        `);

        console.log(`✨ Fragmento vinculado con éxito.`);
    }

    console.log('\n🏁 Restauración completada. Sistema alineado al 100%.');
    process.exit(0);
}

main().catch(console.error);
