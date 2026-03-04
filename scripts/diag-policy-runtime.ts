#!/usr/bin/env bun
/**
 * Diagnóstico rápido de estado FluxCore (Canon v8.3)
 * Ejecuta las 4 consultas clave para detectar bloqueos en la cadena
 * Proyectores → Cola de cognición → Runtime activo.
 */
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

type Row = Record<string, any>;

const pretty = (rows: Row[]) => {
    if (!rows.length) {
        console.log('   (sin filas)');
        return;
    }
    const normalized = rows.map((row) => {
        const obj: Row = {};
        for (const [key, value] of Object.entries(row)) {
            if (value instanceof Date) {
                obj[key] = value.toISOString();
            } else if (typeof value === 'object' && value !== null) {
                obj[key] = JSON.stringify(value);
            } else {
                obj[key] = value;
            }
        }
        return obj;
    });
    console.table(normalized);
};

async function main() {
    console.log('\n1) Projectores con errores pendientes');
    const projectorErrors = await db.execute(sql`
        SELECT projector_name, signal_seq, attempts, error_message
        FROM fluxcore_projector_errors
        WHERE resolved_at IS NULL
        ORDER BY signal_seq DESC
        LIMIT 20
    `);
    pretty((projectorErrors as any).rows ?? (projectorErrors as any));

    console.log('\n2) Cursores de proyectores');
    const projectorCursors = await db.execute(sql`
        SELECT projector_name, last_sequence_number
        FROM fluxcore_projector_cursors
        ORDER BY projector_name
    `);
    pretty((projectorCursors as any).rows ?? (projectorCursors as any));

    console.log('\n3) Entradas pendientes en fluxcore_cognition_queue');
    const pendingQueue = await db.execute(sql`
        SELECT conversation_id, turn_window_expires_at, attempts, last_error
        FROM fluxcore_cognition_queue
        WHERE processed_at IS NULL
        ORDER BY turn_window_expires_at ASC
    `);
    pretty((pendingQueue as any).rows ?? (pendingQueue as any));

    console.log('\n4) Runtimes declarados en asistentes activos');
    const activeAssistants = await db.execute(sql`
        SELECT account_id,
               timing_config->>'mode' AS mode,
               timing_config->>'activeRuntimeId' AS timing_active_runtime,
               runtime
        FROM fluxcore_assistants
        WHERE status = 'active'
        ORDER BY account_id
    `);
    pretty((activeAssistants as any).rows ?? (activeAssistants as any));

    await db.$client?.end?.();
}

main().catch((err) => {
    console.error('❌ Diagnóstico falló:', err);
    process.exit(1);
});
