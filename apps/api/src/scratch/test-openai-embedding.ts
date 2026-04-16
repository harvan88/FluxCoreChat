/**
 * Test: Process the Catálogo.md file into a NEW vector store with OpenAI embeddings
 * This simulates exactly what the user is doing through the UI.
 */
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';
import { documentProcessingService } from '../services/document-processing.service';
import { ragConfigService } from '../services/rag-config.service';
import * as fs from 'fs';
import * as path from 'path';

const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';
const newVectorStoreId = '5ecafddb-d387-4219-ac58-005bd1352d84'; // The new one the user created

async function testOpenAIEmbedding() {
    // 1. Check if this vector store has a RAG config
    console.log('--- Step 1: Check RAG config for new VS ---');
    const config = await ragConfigService.getEffectiveConfig(newVectorStoreId, accountId);
    console.log(`  Provider: ${config.embedding.provider}`);
    console.log(`  Model: ${config.embedding.model}`);
    console.log(`  Dimensions: ${config.embedding.dimensions}`);

    // 2. Check if there are any chunks already
    console.log('\n--- Step 2: Check existing chunks ---');
    const chunks = await db.execute(sql`
        SELECT count(*) as cnt, vector_dims(embedding) as dims
        FROM fluxcore_document_chunks
        WHERE vector_store_id = ${newVectorStoreId}::uuid
          AND embedding IS NOT NULL
        GROUP BY vector_dims(embedding)
    `);
    const rows = Array.isArray(chunks) ? chunks : [];
    if (rows.length === 0) {
        console.log('  No chunks with embeddings found.');
    } else {
        for (const r of rows) {
            console.log(`  Dimension ${(r as any).dims}: ${(r as any).cnt} chunks`);
        }
    }

    // 3. Try processing the Catálogo file
    console.log('\n--- Step 3: Process Catálogo.md ---');
    const catalogPath = path.resolve(process.cwd(), 'docs/reconstruction-phase-1/temp/Catálogo.md');
    if (!fs.existsSync(catalogPath)) {
        console.log(`  ❌ File not found: ${catalogPath}`);
        process.exit(1);
    }
    const content = fs.readFileSync(catalogPath, 'utf-8');
    console.log(`  File size: ${content.length} chars`);

    // We need a file link ID. Let's check if there's one already
    const fileLinks = await db.execute(sql`
        SELECT id, name, status FROM fluxcore_vector_store_files
        WHERE vector_store_id = ${newVectorStoreId}::uuid
        LIMIT 5
    `);
    const linkRows = Array.isArray(fileLinks) ? fileLinks : [];
    console.log(`  Found ${linkRows.length} file link(s)`);
    
    if (linkRows.length > 0) {
        const firstLink = linkRows[0] as any;
        console.log(`  Using link: ${firstLink.id} (${firstLink.name}, status: ${firstLink.status})`);

        try {
            const result = await documentProcessingService.processDocument(
                firstLink.id,
                newVectorStoreId,
                accountId,
                content,
                'text/markdown'
            );
            console.log(`  ✅ Processing complete:`);
            console.log(`    Chunks: ${result.chunksCreated}`);
            console.log(`    Tokens: ${result.tokensProcessed}`);
            console.log(`    Time: ${result.processingTimeMs}ms`);
        } catch (e: any) {
            console.log(`  ❌ Processing FAILED: ${e.message}`);
        }
    } else {
        console.log('  ⚠️ No file links found. Try uploading through the UI first.');
    }

    process.exit(0);
}

testOpenAIEmbedding().catch(err => { console.error(err); process.exit(1); });
