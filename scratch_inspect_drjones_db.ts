
import { db, accountLocations, fluxcoreAssistants, fluxcoreInstructions, eq, sql } from '@fluxcore/db';

async function inspectDrJonesDB() {
    const drJonesAccountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    
    console.log('--- INSPECCIONANDO DB DR. JONES (V3) ---');

    // 1. Sedes
    const locations = await db.select().from(accountLocations).where(eq(accountLocations.accountId, drJonesAccountId));
    console.log('\n[Sedes]');
    locations.forEach(loc => {
        console.log(`- Sede: ${loc.name}`);
        console.log(`  Dirección: "${loc.address}"`);
    });

    // 2. Instrucciones
    const allInstructions = await db.select().from(fluxcoreInstructions).where(eq(fluxcoreInstructions.accountId, drJonesAccountId));
    console.log('\n[Instrucciones]');
    for (const inst of allInstructions) {
        const versionResult = await db.execute(sql`
            SELECT content FROM fluxcore_instruction_versions 
            WHERE instruction_id = ${inst.id} 
            ORDER BY created_at DESC LIMIT 1
        `) as any;
        
        const content = versionResult[0]?.content || '';
        console.log(`- Instrucción Slug: ${inst.slug}`);
        if (content.includes('Estado operativo') || content.includes('🔴') || content.includes('🟢')) {
            console.log('  ⚠️ ¡ALERTA! Esta instrucción tiene la frase de estado operativo o emojis de estado.');
            console.log(`  CONTENIDO:\n${content}\n`);
        } else {
            console.log('  (Limpia)');
        }
    }

    process.exit(0);
}

inspectDrJonesDB().catch(console.error);
