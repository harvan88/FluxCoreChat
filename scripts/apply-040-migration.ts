import { sql } from 'drizzle-orm';
import { db } from '@fluxcore/db';

async function main() {
    console.log('🔄 Migration 040: Decouple Conversation from Relationship\n');

    try {
        console.log('📦 Altering conversations table...');

        // 1. Make relationship_id nullable
        await db.execute(sql`
            ALTER TABLE conversations 
            ALTER COLUMN relationship_id DROP NOT NULL
        `);

        // 2. Add owner_account_id
        await db.execute(sql`
            ALTER TABLE conversations 
            ADD COLUMN IF NOT EXISTS owner_account_id UUID REFERENCES accounts(id)
        `);
        
        // 3. Backfill owner_account_id from relationship (best effort)
        await db.execute(sql`
            UPDATE conversations c
            SET owner_account_id = r.account_a_id
            FROM relationships r
            WHERE c.relationship_id = r.id
            AND c.owner_account_id IS NULL
        `);

        console.log('  ✅ conversations table updated');
        console.log('\n✅ Migration 040 completed successfully!');

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();
