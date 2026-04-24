
import { db } from '../index';
import { assets, fluxcoreVectorStoreFiles, fluxcoreFiles, fluxcoreDocumentChunks } from '../schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { embeddingService } from '../../../../apps/api/src/services/embedding.service';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const vsId = '1ec257ac-d14a-4174-875a-eba81b972eaf';
    
    // Restauraremos ambos mundos para ver si se discriminan bien
    const filesToRestore = [
        {
            name: 'precios de tratamientos.md',
            path: 'docs/reconstruction-phase-1/temp/precios de tratamientos.md'
        },
        {
            name: 'Catálogo.md',
            path: 'docs/reconstruction-phase-1/temp/Catálogo.md'
        }
    ];

    console.log(`--- RESTAURACIÓN DE PRECISIÓN V3 (Plantillas Style) ---`);

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
            storageKey: `restored-v3/${Date.now()}-${fileDef.name}`,
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

        // 4. Fragmentación por secciones (Plantilla Style: Fragmentos denso y cortos)
        const sections = content.split('---').map(s => s.trim()).filter(s => s.length > 50);
        console.log(`📡 Generando ${sections.length} vectores para ${fileDef.name}...`);
        
        for (let i = 0; i < sections.length; i++) {
            const chunkText = sections[i];
            const { embedding } = await embeddingService.embedWithConfig(chunkText, {
                provider: 'local',
                model: 'paraphrase-multilingual-MiniLM-L12-v2',
                dimensions: 384
            });

            const [chunk] = await db.insert(fluxcoreDocumentChunks).values({
                fileId: asset.id,
                accountId,
                embeddingModel: 'paraphrase-multilingual-MiniLM-L12-v2',
                content: chunkText,
                chunkIndex: i,
                tokenCount: Math.ceil(chunkText.length / 4),
                metadata: { documentTitle: fileDef.name, sectionIndex: i }
            }).returning();

            const embeddingStr = `[${embedding.join(',')}]`;
            await db.execute(sql`
                UPDATE fluxcore_document_chunks
                SET embedding = ${sql.raw(`'${embeddingStr}'::vector`)}
                WHERE id = ${chunk.id}::uuid
            `);
            console.log(`   ✅ Fragmento ${i} vinculado (Score base listo).`);
        }
    }

    console.log('\n🏁 Restauración V3 completada. Mundo dual alineado.');
    process.exit(0);
}

main().catch(console.error);
