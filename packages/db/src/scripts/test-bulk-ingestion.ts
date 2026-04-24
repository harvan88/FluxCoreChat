import { templateService } from '../../../../apps/api/src/services/template.service';
import { db, assets, fluxcoreDocumentChunks } from '../index';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('--- PRUEBA DE INGESTA MASIVA RAG ---');
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';

    const sampleTemplates = [
        { name: "Bulk - IA ACTIVA", content: "Informacion sensible para IA", authorizeForAI: true },
        { name: "Bulk - SOLO TEXTO", content: "Contenido puramente administrativo", authorizeForAI: false }
    ];

    console.log('1. Ejecutando creacion masiva...');
    const inserted = await templateService.bulkCreateTemplates(accountId, sampleTemplates as any);
    
    console.log('2. Esperando procesamiento de vectores (5s)...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('\n3. Resultados del Paraiso RAG:');
    for (const t of inserted) {
        const [asset] = await db.select().from(assets).where(eq(assets.id, t.id));
        const [chunk] = await db.select().from(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.fileId, t.id));
        const ai = sampleTemplates.find(s => s.name === t.name)?.authorizeForAI;
        
        console.log(`> [${t.name}] | IA: ${ai ? 'ON' : 'OFF'} | Asset: ${asset?.status || 'N/A'} | Vector: ${!!chunk?.embedding ? 'SI' : 'NO'}`);
    }
    process.exit(0);
}
main().catch(console.error);
