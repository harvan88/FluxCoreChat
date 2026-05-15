import { db, templates } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function check() {
    const templateId = '63d63f9a-c7d4-40c4-9430-20b4be0a59c5';
    const result = await db.select().from(templates).where(eq(templates.id, templateId));
    
    if (result.length === 0) {
        console.log('❌ Plantilla no encontrada');
        return;
    }

    const t = result[0];
    console.log('✅ Plantilla Encontrada');
    console.log('ID:', t.id);
    console.log('Nombre:', t.name);
    console.log('--- CONTENIDO ---');
    console.log(t.content);
    console.log('-----------------');
    
    if (t.content?.includes('{{system:schedules}}')) {
        console.log('🛡️ La etiqueta {{system:schedules}} ESTÁ presente.');
    } else {
        console.log('🚨 LA ETIQUETA NO ESTÁ. El contenido es estático.');
    }
}

check().catch(console.error);
