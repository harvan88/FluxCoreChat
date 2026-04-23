import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { generateManagedInstructionContent } from '../apps/api/src/services/fluxcore/assistants.service';

async function main() {
    const accountId = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
    console.log(`📡 Evaluando cuenta: ${accountId}`);

    // Snapshot
    const [original] = await db.select({ privateContext: accounts.privateContext }).from(accounts).where(eq(accounts.id, accountId));
    const backupContext = original?.privateContext ?? null;

    try {
        console.log('\n======================================================');
        console.log('🧪 ESCENARIO 1: privateContext VACÍO');
        await db.update(accounts).set({ privateContext: '' }).where(eq(accounts.id, accountId));
        const res1 = await generateManagedInstructionContent(accountId);
        console.log('RESULTADO ESPERADO: Instrucciones de "Cori"');
        console.log('RESULTADO OBTENIDO:');
        console.log(res1 === '' ? '[STRING VACÍO]' : res1);
        console.log('======================================================\n');

        console.log('======================================================');
        console.log('🧪 ESCENARIO 2: privateContext CON CONTENIDO ("Soy una clínica...")');
        await db.update(accounts).set({ privateContext: 'Soy una clínica...' }).where(eq(accounts.id, accountId));
        const res2 = await generateManagedInstructionContent(accountId);
        console.log('RESULTADO ESPERADO: String vacío (porque existe contexto)');
        console.log('RESULTADO OBTENIDO:');
        console.log(res2 === '' ? '[STRING VACÍO ✅ CORRECTO]' : res2);
        console.log('======================================================\n');

    } finally {
        // Restaurar
        await db.update(accounts).set({ privateContext: backupContext }).where(eq(accounts.id, accountId));
        console.log('✅ Contexto original de la cuenta restaurado con éxito.');
        process.exit(0);
    }
}

main().catch(console.error);
