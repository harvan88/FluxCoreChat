import { db } from '@fluxcore/db';
import { fluxcoreRagConfigurations, fluxcoreVectorStores } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ruben (Ragno)
    
    console.log(`Buscando Vector Stores para la cuenta ${accountId}...`);
    
    const vss = await db.select().from(fluxcoreVectorStores)
        .where(eq(fluxcoreVectorStores.accountId, accountId));
    
    if (vss.length === 0) {
        console.error("No se encontraron Vector Stores para esta cuenta.");
        return;
    }
    
    for (const vs of vss) {
        console.log(`Sincronizando VS: ${vs.name} (${vs.id})...`);
        
        // Verificar si ya existe config
        const existing = await db.select().from(fluxcoreRagConfigurations)
            .where(eq(fluxcoreRagConfigurations.vectorStoreId, vs.id));
        
        const configData = {
            vectorStoreId: vs.id,
            accountId: accountId,
            name: `Sync Fix - ${vs.name}`,
            isDefault: true,
            // CHUNKING: Mantenemos defaults
            chunkingStrategy: 'recursive' as any,
            chunkSizeTokens: 512,
            chunkOverlapTokens: 50,
            // EMBEDDING: Forzamos la realidad del catálogo (Local/384)
            embeddingProvider: 'local' as any,
            embeddingModel: 'paraphrase-multilingual-MiniLM-L12-v2',
            embeddingDimensions: 384,
            // RETRIEVAL: Subimos un poco el topK para dar más contexto
            retrievalTopK: 5,
            retrievalMinScore: '0.250',
            retrievalMaxTokens: 2000,
        };

        if (existing.length > 0) {
            console.log(`Actualizando configuración existente (${existing[0].id})...`);
            await db.update(fluxcoreRagConfigurations)
                .set(configData)
                .where(eq(fluxcoreRagConfigurations.id, existing[0].id));
        } else {
            console.log(`Creando nueva configuración...`);
            await db.insert(fluxcoreRagConfigurations).values(configData);
        }
    }
    
    console.log("¡Sincronización completada!");
}

main().catch(console.error);
