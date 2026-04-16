import { db, fluxcoreDocumentChunks } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';
    
    console.log(`--- Analizando chunks de Ragno ---`);
    const chunks = await db.select({
        id: fluxcoreDocumentChunks.id,
        content: fluxcoreDocumentChunks.content
    }).from(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.accountId, accountId));
    
    console.log(`Total chunks: ${chunks.length}`);
    
    const cockroachChunks = chunks.filter(c => 
        c.content.toLowerCase().includes('cucaracha') || 
        c.content.toLowerCase().includes('blattella') || 
        c.content.toLowerCase().includes('germanica')
    );
    
    console.log(`Chunks de cucarachas encontrados: ${cockroachChunks.length}`);
    
    if (cockroachChunks.length > 0) {
        cockroachChunks.forEach((c, i) => {
            console.log(`\n[Chunk ${i+1}] ID: ${c.id}`);
            console.log(`Contenido: ${c.content.substring(0, 200)}...`);
        });
    } else {
        console.error("❌ LA CUCARACHA NO ESTÁ EN EL VECTOR STORE.");
    }
}

main().catch(console.error);
