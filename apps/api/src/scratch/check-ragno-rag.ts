import { db } from '@fluxcore/db';
import { accounts, fluxcoreDocumentChunks, fluxcoreRagConfigurations } from '@fluxcore/db';
import { sql, eq, ilike } from 'drizzle-orm';

async function main() {
    console.log("--- Investigando cuenta Ragno ---");
    
    // 1. Encontrar la cuenta
    // Buscamos por alias, displayName o ID parcial si es posible
    const match = await db.execute(sql`
        SELECT id, display_name, alias 
        FROM accounts 
        WHERE id::text LIKE '2fef52df%' 
           OR display_name ILIKE '%Ragno%' 
           OR alias ILIKE '%ragno%'
        LIMIT 5
    `);
    
    const accounts_found = Array.isArray(match) ? match : [];
    
    if (accounts_found.length === 0) {
        console.error("No se encontró la cuenta vinculada a 'Ragno' o al ID 2fef52df.");
        // Listar algunas cuentas para referencia
        const all = await db.select({id: accounts.id, name: accounts.displayName}).from(accounts).limit(5);
        console.log("Cuentas en DB:", all);
        process.exit(1);
    }
    
    console.log("Cuentas encontradas:", accounts_found);
    const accountId = accounts_found[0].id;
    const accountName = accounts_found[0].display_name;
    
    // 2. Verificar dimensiones de los chunks
    console.log("\n--- Dimensiones de Chunks en DB ---");
    const dims = await db.execute(sql`
        SELECT DISTINCT vector_dims(embedding) as dims, count(*) as count
        FROM fluxcore_document_chunks
        WHERE account_id = ${accountId}
        GROUP BY 1
    `);
    console.log(dims);
    
    // 3. Verificar Configuración RAG
    console.log("\n--- Configuración RAG Efectiva ---");
    const configs = await db.select().from(fluxcoreRagConfigurations)
        .where(eq(fluxcoreRagConfigurations.accountId, accountId));
    
    if (configs.length === 0) {
        console.log("No hay configuraciones específicas. Usando DEFAULT_RAG_CONFIG.");
    } else {
        configs.forEach(c => {
            console.log(`Config: ${c.name} (Default: ${c.isDefault})`);
            console.log(`  Provider: ${c.embeddingProvider}`);
            console.log(`  Model: ${c.embeddingModel}`);
            console.log(`  Dimensions: ${c.embeddingDimensions}`);
        });
    }
}

main().catch(console.error);
