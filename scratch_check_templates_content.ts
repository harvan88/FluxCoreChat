
import { db, templates, eq } from '@fluxcore/db';

async function checkTemplates() {
    const drJonesAccountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const tpls = await db.select().from(templates).where(eq(templates.accountId, drJonesAccountId));
    
    console.log('--- AUDITANDO PLANTILLAS DR. JONES ---');
    for (const t of tpls) {
        console.log(`\n[Plantilla] Name: ${t.name} | ID: ${t.id}`);
        console.log(`Contenido: "${t.content}"`);
        if (t.content?.includes('Estado operativo') || t.content?.includes('🔴')) {
            console.log('⚠️ ¡ENCONTRADO! Esta plantilla tiene el estado hardcodeado.');
        }
    }
    process.exit(0);
}

checkTemplates().catch(console.error);
