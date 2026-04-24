
import { db } from '../index';
import { fluxcoreRagConfigurations } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('--- CONFIGURACIONES RAG REGISTRADAS ---');

    const configs = await db.select().from(fluxcoreRagConfigurations);

    configs.forEach(c => {
        console.log(`\n[Config: ${c.name}] ID: ${c.id}`);
        console.log(`Account ID: ${c.accountId}`);
        console.log(`Vector Store ID: ${c.vectorStoreId}`);
        console.log(`Default: ${c.isDefault}`);
        console.log(`Provider: ${c.embeddingProvider}`);
        console.log(`Model: ${c.embeddingModel}`);
        console.log(`Dimensions: ${c.embeddingDimensions}`);
    });

    if (configs.length === 0) {
        console.log('No hay configuraciones registradas.');
    }

    process.exit(0);
}

main().catch(console.error);
