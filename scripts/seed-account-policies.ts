#!/usr/bin/env bun
/**
 * Seed/normalize fluxcore_account_policies based on Canon v8.3
 * 1. Copy timingConfig from active assistants into account policies (upsert)
 * 2. Insert defaults for accounts without assistants/policies
 */
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🌱 Normalizando fluxcore_account_policies...');

  const upsertFromAssistants = await db.execute(sql`
    INSERT INTO fluxcore_account_policies (
      account_id,
      mode,
      response_delay_ms,
      turn_window_ms,
      turn_window_typing_ms,
      turn_window_max_ms,
      off_hours_policy
    )
    SELECT
      fa.account_id::uuid,
      COALESCE(fa.timing_config->>'mode', 'off'),
      COALESCE((fa.timing_config->>'responseDelaySeconds')::int * 1000, 2000),
      COALESCE((fa.timing_config->>'turnWindowMs')::int, 3000),
      COALESCE((fa.timing_config->>'turnWindowTypingMs')::int, 5000),
      COALESCE((fa.timing_config->>'turnWindowMaxMs')::int, 60000),
      COALESCE((fa.timing_config->>'offHoursPolicy')::jsonb, '{"action":"ignore"}'::jsonb)
    FROM fluxcore_assistants fa
    WHERE fa.status = 'active'
    ON CONFLICT (account_id) DO UPDATE SET
      mode = EXCLUDED.mode,
      response_delay_ms = EXCLUDED.response_delay_ms,
      turn_window_ms = EXCLUDED.turn_window_ms,
      turn_window_typing_ms = EXCLUDED.turn_window_typing_ms,
      turn_window_max_ms = EXCLUDED.turn_window_max_ms,
      off_hours_policy = EXCLUDED.off_hours_policy,
      updated_at = now();
  `);
  console.log('   ⮕ Upsert asistentes activos:', (upsertFromAssistants as any).rowCount ?? 'ok');

  const insertDefaults = await db.execute(sql`
    INSERT INTO fluxcore_account_policies (account_id)
    SELECT a.id
    FROM accounts a
    WHERE NOT EXISTS (
      SELECT 1 FROM fluxcore_account_policies f WHERE f.account_id = a.id
    )
    ON CONFLICT DO NOTHING;
  `);
  console.log('   ⮕ Defaults agregados:', (insertDefaults as any).rowCount ?? 'ok');

  const rawClient = (db as any).$client as { end?: () => Promise<void> } | undefined;
  await rawClient?.end?.();
  console.log('✅ Listo.');
}

main().catch((err) => {
  console.error('❌ Error normalizando policies:', err);
  process.exit(1);
});
