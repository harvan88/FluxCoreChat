import { db, accounts } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('🔧 HABILITANDO IA PARA TODAS LAS CUENTAS\n');
    console.log('Este script cambia mode de "off" a "auto" en fluxcore_account_policies\n');

    // 1. Listar cuentas actuales
    const allAccounts = await db.select().from(accounts);
    console.log(`Encontradas ${allAccounts.length} cuentas en el sistema:\n`);

    for (const account of allAccounts) {
        // 2. Verificar política actual
        const currentPolicy = await db.execute(sql`
            SELECT mode FROM fluxcore_account_policies
            WHERE account_id = ${account.id}
        `) as any;

        const currentMode = currentPolicy[0]?.mode || 'NO_EXISTE';
        
        console.log(`   ${account.username} (${account.id.slice(0, 8)}): ${currentMode}`);

        // 3. Actualizar a AUTO
        if (currentMode === 'off' || currentMode === 'NO_EXISTE') {
            await db.execute(sql`
                INSERT INTO fluxcore_account_policies (
                    account_id, mode, response_delay_ms, turn_window_ms,
                    turn_window_typing_ms, turn_window_max_ms, off_hours_policy
                ) VALUES (
                    ${account.id}, 'auto', 3000, 3000, 5000, 60000, '{"action":"ignore"}'::jsonb
                )
                ON CONFLICT (account_id) DO UPDATE SET
                    mode = 'auto'
            `);
            console.log(`      → ✅ Cambiado a AUTO`);
        }
    }

    console.log('\n✅ Todas las cuentas ahora tienen mode=auto');
    console.log('🤖 FluxCore ahora responderá automáticamente a mensajes de visitantes');
}

main().catch(console.error).then(() => process.exit(0));
