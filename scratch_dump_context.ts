
import { db, accounts, eq } from '@fluxcore/db';

async function dumpPrivateContext() {
    const acc = await db.select().from(accounts).where(eq(accounts.id, '65d340af-97ff-4c9b-85d2-b378badeacf4')).limit(1);
    if (acc[0]) {
        console.log('--- PRIVATE CONTEXT COMPLETO ---');
        console.log(acc[0].privateContext);
        console.log('--- FIN ---');
    } else {
        console.log('Cuenta no encontrada');
    }
    process.exit(0);
}

dumpPrivateContext().catch(console.error);
