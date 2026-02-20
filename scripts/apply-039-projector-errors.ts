#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('📦 Applying migration 039: fluxcore_projector_errors...\n');

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS fluxcore_projector_errors (
            id              BIGSERIAL PRIMARY KEY,
            projector_name  TEXT NOT NULL,
            signal_seq      BIGINT NOT NULL
                REFERENCES fluxcore_signals(sequence_number) ON DELETE CASCADE,
            error_message   TEXT NOT NULL,
            error_stack     TEXT,
            attempts        INT NOT NULL DEFAULT 1,
            first_failed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            last_failed_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            resolved_at     TIMESTAMPTZ,
            CONSTRAINT ux_projector_signal UNIQUE (projector_name, signal_seq)
        )
    `);

    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_projector_errors_unresolved
            ON fluxcore_projector_errors (resolved_at)
            WHERE resolved_at IS NULL
    `);

    console.log('✅ Table fluxcore_projector_errors created\n');

    // Verify
    const result = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'fluxcore_projector_errors'
        ORDER BY ordinal_position
    `);
    console.log('Columns:', result.rows.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Migration 039 failed:', err);
    process.exit(1);
});
