import { db, sql } from '@fluxcore/db';

async function fixDatabase() {
    try {
        console.log('--- 🛠️  Starting Database Normalization (Canon v8.3) ---');

        // 1. Fix fluxcore_assistants table
        console.log('Updating fluxcore_assistants...');
        await db.execute(sql`
            ALTER TABLE fluxcore_assistants 
            ADD COLUMN IF NOT EXISTS authorized_data_scopes TEXT[] NOT NULL DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS authorized_tools TEXT[] NOT NULL DEFAULT '{}'
        `);
        console.log('✅ Added authorized_data_scopes and authorized_tools to fluxcore_assistants');

        // 2. Clean up fluxcore_account_policies
        // Note: Canon v8.3 says tone, language, use_emojis belong to assistant, not policy.
        // We keep them if they exist but moving them to assistant is the goal.
        // Since they are already in the assistant JSONB, we can safely remove them from policies.
        console.log('Updating fluxcore_account_policies...');
        await db.execute(sql`
            ALTER TABLE fluxcore_account_policies
            DROP COLUMN IF EXISTS tone,
            DROP COLUMN IF EXISTS language,
            DROP COLUMN IF EXISTS use_emojis
        `);
        console.log('✅ Removed redundant columns from fluxcore_account_policies');

        // 3. Ensure N:M relationship tables exist
        console.log('Verifying relationship tables...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS fluxcore_assistant_instructions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                assistant_id UUID NOT NULL REFERENCES fluxcore_assistants(id) ON DELETE CASCADE,
                instruction_id UUID NOT NULL,
                "order" INTEGER NOT NULL DEFAULT 0,
                is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
                UNIQUE(assistant_id, instruction_id)
            );
            
            CREATE TABLE IF NOT EXISTS fluxcore_assistant_vector_stores (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                assistant_id UUID NOT NULL REFERENCES fluxcore_assistants(id) ON DELETE CASCADE,
                vector_store_id UUID NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
                UNIQUE(assistant_id, vector_store_id)
            );

            CREATE TABLE IF NOT EXISTS fluxcore_assistant_tools (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                assistant_id UUID NOT NULL REFERENCES fluxcore_assistants(id) ON DELETE CASCADE,
                tool_connection_id UUID NOT NULL, 
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
                UNIQUE(assistant_id, tool_connection_id)
            );
        `);
        console.log('✅ Relationship tables verified/created');

        console.log('--- 🎉 Database Normalization Complete ---');
    } catch (err) {
        console.error('❌ CRITICAL ERROR during normalization:', err);
    }
    process.exit(0);
}

fixDatabase();
