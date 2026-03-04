import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('🔍 Verificando índice parcial y duplicados pendientes...');

    const indexResult = await db.execute(sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'fluxcore_cognition_queue'
          AND indexdef LIKE '%processed_at IS NULL%'
    `);

    const indexes = (indexResult as any).rows ?? indexResult;
    console.log('\nÍndices encontrados con condición processed_at IS NULL:');
    console.table(indexes);

    const dupesResult = await db.execute(sql`
        SELECT conversation_id, COUNT(*) AS pending
        FROM fluxcore_cognition_queue
        WHERE processed_at IS NULL
        GROUP BY conversation_id
        HAVING COUNT(*) > 1
    `);

    const dupes = (dupesResult as any).rows ?? dupesResult;
    if (dupes.length === 0) {
        console.log('\n✅ No hay conversaciones duplicadas pendientes.');
    } else {
        console.log('\n⚠️ Conversaciones con entradas pendientes duplicadas:');
        console.table(dupes);
    }

    const pendingEntries = await db.execute(sql`
        SELECT id, conversation_id, account_id, last_signal_seq, turn_window_expires_at, attempts
        FROM fluxcore_cognition_queue
        WHERE processed_at IS NULL
        ORDER BY turn_window_expires_at ASC
        LIMIT 10
    `);

    const pendingRows = (pendingEntries as any).rows ?? pendingEntries;
    console.log('\n📋 Pendientes (máx 10):');
    if (pendingRows.length === 0) {
        console.log('   No hay turnos pendientes.');
    } else {
        console.table(pendingRows);
    }

    await db.$client?.end?.();
}

main().catch((err) => {
    console.error('❌ Error ejecutando verificación:', err);
    process.exit(1);
});
