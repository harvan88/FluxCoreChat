
import { db } from '../packages/db/src/connection';
import { assets, accounts, fluxcoreVectorStores, fluxcoreVectorStoreFiles } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { documentProcessingService } from '../apps/api/src/services/document-processing.service';
import { retrievalService } from '../apps/api/src/services/retrieval.service';
import { RAGConfig } from '../apps/api/src/services/rag-config.service';

async function main() {
    try {
        console.log('--- TEST ASSET-CENTRIC RAG ---');

        // 1. Setup básico
        const testAccount = await db.select().from(accounts).limit(1);
        if (testAccount.length === 0) {
            console.error('No se encontró cuenta para testing');
            process.exit(1);
        }
        const accountId = testAccount[0].id;
        console.log(`Usando cuenta: ${accountId}`);

        // Leer el archivo de precios
        const filePath = path.join(__dirname, '..', 'docs', 'reconstruction-phase-1', 'temp', 'precios de tratamientos.md');
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // 2. Mocking Ingestion: Asset Creation
        const [asset] = await db.insert(assets).values({
            accountId,
            name: 'precios de tratamientos.md',
            storageKey: 'test-rag-asset.md',
            originalName: 'precios de tratamientos.md',
            mimeType: 'text/markdown',
            sizeBytes: fileContent.length,
            status: 'ready'
        }).returning();
        
        console.log(`Asset Maestro Creado: ${asset.id}`);

        // 3. Crear un Vector Store (Carpeta)
        const [vectorStore] = await db.insert(fluxcoreVectorStores).values({
            accountId,
            name: 'Vector Store Testing RAG',
            description: 'Prueba Eager/Lazy embedding',
            backend: 'local'
        }).returning();

        console.log(`Vector Store Creado: ${vectorStore.id}`);

        // 4. Vincular Asset al Vector Store
        const [vectorStoreFile] = await db.insert(fluxcoreVectorStoreFiles).values({
            vectorStoreId: vectorStore.id,
            fileId: asset.id,
        }).returning();
        console.log(`Enlace de Vector Store File Creado: ${vectorStoreFile.id}`);

        // 5. Motor de Ingesta EAGER LOCAL (Ocurre al subirse por UI)
        console.log('Iniciando DocumentProcessingService...');
        // Mock function for job updates
        const jobMock = { id: 'job-123' };
        
        await documentProcessingService.processDocument(
            vectorStoreFile.id, 
            vectorStore.id,
            accountId,
            fileContent,
            'text/markdown'
        );

        console.log('Ingesta Finalizada Exitosamente. Chunks insertados con embeddingModel local.');

        // 6. Probar Retrieval
        console.log('Consultando: "Botox"');
        const results = await retrievalService.hybridSearch("Botox", [vectorStore.id], accountId);

        console.log(`\n=== RESULTADOS DE BÚSQUEDA ===`);
        for (const chunk of results.chunks) {
            console.log(`Score: ${Math.round(chunk.similarity * 100)}% | Chunks extraídos.`);
            console.log(chunk.content.substring(0, 150) + '...');
        }

        process.exit(0);
    } catch (e) {
        console.error('Test falló:', e);
        process.exit(1);
    }
}

main();
