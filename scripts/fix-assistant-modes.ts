/**
 * fix-assistant-modes.ts
 * 
 * Sets timingConfig.mode = 'auto' on ALL active/production assistants
 * that either have no mode field or have mode='suggest'/'off'.
 * 
 * This fixes the root cause: "Asistente por defecto" was created without
 * a mode field and inherits whatever extensionInstallations.config.mode says.
 */
import { db, sql } from '@fluxcore/db';

console.log('🔧 Fixing assistant modes...\n');

const result = await db.execute(sql`
    SELECT id, name, account_id, status,
           timing_config->>'mode' as current_mode,
           timing_config
    FROM fluxcore_assistants
    WHERE status IN ('active', 'production')
    ORDER BY updated_at DESC
`);

console.log(`Found ${result.length} active/production assistants:\n`);
for (const row of result as any[]) {
    console.log(`  ${(row.id as string).slice(0, 8)} "${row.name}" status=${row.status} mode=${row.current_mode ?? '(none)'}`);
}

const toFix = (result as any[]).filter(r => !r.current_mode || r.current_mode === 'suggest' && r.name === 'Asistente por defecto');
console.log(`\n${toFix.length} assistants need fixing`);

if (toFix.length === 0) {
    console.log('✅ All good — no fixes needed');
    process.exit(0);
}

// Fix: set mode='auto' where mode is missing
const fixed = await db.execute(sql`
    UPDATE fluxcore_assistants
    SET timing_config = timing_config || '{"mode": "auto"}'::jsonb,
        updated_at = NOW()
    WHERE status IN ('active', 'production')
      AND (timing_config->>'mode' IS NULL OR timing_config->>'mode' = '')
    RETURNING id, name, timing_config->>'mode' as new_mode
`);

console.log(`\n✅ Fixed ${fixed.length} assistants → mode='auto'`);
for (const row of fixed as any[]) {
    console.log(`  ${(row.id as string).slice(0, 8)} "${row.name}" → ${row.new_mode}`);
}

process.exit(0);
