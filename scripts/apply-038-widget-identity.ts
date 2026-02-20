import { sql } from 'drizzle-orm';
import { db } from '@fluxcore/db';

async function main() {
    console.log('🔄 Migration 038: Widget Identity Model\n');

    try {
        // ─────────────────────────────────────────────────────────
        // 1. fluxcore_actors — nuevas columnas
        // ─────────────────────────────────────────────────────────
        console.log('📦 1. Adding columns to fluxcore_actors...');

        await db.execute(sql`
            ALTER TABLE fluxcore_actors
                ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'real'
                    CHECK (type IN ('provisional', 'real'))
        `);

        await db.execute(sql`
            ALTER TABLE fluxcore_actors
                ADD COLUMN IF NOT EXISTS external_key TEXT
        `);

        await db.execute(sql`
            ALTER TABLE fluxcore_actors
                ADD COLUMN IF NOT EXISTS tenant_id TEXT
        `);

        await db.execute(sql`
            ALTER TABLE fluxcore_actors
                ADD COLUMN IF NOT EXISTS created_from_signal BIGINT
                    REFERENCES fluxcore_signals(sequence_number)
        `);

        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_fluxcore_actors_external_key
                ON fluxcore_actors (external_key)
                WHERE external_key IS NOT NULL
        `);

        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_fluxcore_actors_tenant
                ON fluxcore_actors (tenant_id)
                WHERE tenant_id IS NOT NULL
        `);

        console.log('  ✅ fluxcore_actors columns added');

        // ─────────────────────────────────────────────────────────
        // 2. fluxcore_actor_identity_links — nueva tabla
        // ─────────────────────────────────────────────────────────
        console.log('📦 2. Creating fluxcore_actor_identity_links...');

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS fluxcore_actor_identity_links (
                id                    BIGSERIAL PRIMARY KEY,
                provisional_actor_id  TEXT NOT NULL,
                real_account_id       TEXT NOT NULL,
                tenant_id             TEXT NOT NULL,
                linking_signal_seq    BIGINT NOT NULL
                    REFERENCES fluxcore_signals(sequence_number),
                linked_at             TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
                UNIQUE (provisional_actor_id)
            )
        `);

        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_actor_identity_links_real
                ON fluxcore_actor_identity_links (real_account_id)
        `);

        console.log('  ✅ fluxcore_actor_identity_links created');

        // ─────────────────────────────────────────────────────────
        // 3. conversations — columnas para widget
        // ─────────────────────────────────────────────────────────
        console.log('📦 3. Adding columns to conversations...');

        await db.execute(sql`
            ALTER TABLE conversations
                ADD COLUMN IF NOT EXISTS visitor_token TEXT
        `);

        await db.execute(sql`
            ALTER TABLE conversations
                ADD COLUMN IF NOT EXISTS identity_linked_at TIMESTAMPTZ
        `);

        await db.execute(sql`
            ALTER TABLE conversations
                ADD COLUMN IF NOT EXISTS linked_account_id TEXT
        `);

        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_conversations_visitor_token
                ON conversations (visitor_token)
                WHERE visitor_token IS NOT NULL
        `);

        console.log('  ✅ conversations columns added');

        console.log('\n✅ Migration 038 completed successfully!');
        console.log('   - fluxcore_actors: type, external_key, tenant_id, created_from_signal');
        console.log('   - fluxcore_actor_identity_links: new table');
        console.log('   - conversations: visitor_token, identity_linked_at, linked_account_id');

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();
