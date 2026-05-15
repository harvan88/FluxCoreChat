
import { db, accounts, fluxcoreAssistants, eq } from '@fluxcore/db';

async function auditDatabaseContent() {
    console.log('--- AUDITANDO BASE DE DATOS (Soberanía de Datos) ---');
    
    // 1. Auditar Cuentas
    const allAccounts = await db.select().from(accounts);
    for (const acc of allAccounts) {
        console.log(`\n[Cuenta] ID: ${acc.id} | Name: ${acc.displayName}`);
        console.log(`- Private Context: ${acc.privateContext?.slice(0, 500) || 'Vacío'}`);
        if (acc.privateContext?.includes('Estado operativo')) {
            console.log('!!! ENCONTRADO EN privateContext !!!');
        }
    }

    // 2. Auditar Asistentes
    const assistants = await db.select().from(fluxcoreAssistants);
    for (const asis of assistants) {
        console.log(`\n[Asistente] ID: ${asis.id} | Name: ${asis.name}`);
        // Ver instrucciones si están disponibles en el objeto
        console.log(`- Status: ${asis.status}`);
        // Si hay un campo de instrucciones directas o config
        console.log(`- Model Config: ${JSON.stringify(asis.modelConfig)}`);
    }

    process.exit(0);
}

auditDatabaseContent().catch(console.error);
