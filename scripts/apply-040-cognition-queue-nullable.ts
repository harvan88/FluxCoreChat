#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('📦 Applying migration 040: cognition_queue nullable last_signal_seq + unique index...\n');

    // 1. Drop FK constraint on last_signal_seq (if exists)
    const constraintRows = await db.execute(sql`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'fluxcore_cognition_queue'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'last_signal_seq'
        LIMIT 1
    `);

    const constraintName = (constraintRows.rows ?? constraintRows)?.[0]?.constraint_name as string | undefined;
    if (constraintName) {
        console.log(`Dropping FK constraint: ${constraintName}`);
        await db.execute(sql.raw(`ALTER TABLE fluxcore_cognition_queue DROP CONSTRAINT "${constraintName}"`));
        console.log('✅ FK constraint dropped');
    } else {
        console.log('ℹ️  No FK constraint found on last_signal_seq — skipping');
    }

    // 2. Make last_signal_seq nullable
    await db.execute(sql`
        ALTER TABLE fluxcore_cognition_queue
            ALTER COLUMN last_signal_seq DROP NOT NULL
    `);
    console.log('✅ last_signal_seq is now nullable');

    // 3. Add unique partial index on conversation_id WHERE processed_at IS NULL
    await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_cognition_queue_pending_conversation
            ON fluxcore_cognition_queue (conversation_id)
            WHERE processed_at IS NULL
    `);
    console.log('✅ Unique partial index ux_cognition_queue_pending_conversation created');

    // Verify
    const cols = await db.execute(sql`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'fluxcore_cognition_queue'
          AND column_name = 'last_signal_seq'
    `);
    const col = (cols.rows ?? cols)?.[0] as any;
    console.log(`\nVerify last_signal_seq: is_nullable=${col?.is_nullable ?? 'unknown'}`);

    console.log('\n🎉 Migration 040 complete.\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Migration 040 failed:', err);
    process.exit(1);
});
