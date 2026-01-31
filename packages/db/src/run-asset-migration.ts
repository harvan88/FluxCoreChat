/**
 * Script para ejecutar solo la migración de tablas de assets
 */

import { db } from './connection';
import { sql } from 'drizzle-orm';

async function runAssetMigration() {
    console.log('🚀 Running Asset Management migration...');

    try {
        // Crear enums
        console.log('Creating enums...');
        
        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE "asset_scope" AS ENUM('message_attachment', 'template_asset', 'execution_plan', 'shared_internal', 'profile_avatar', 'workspace_asset');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE "asset_status" AS ENUM('pending', 'ready', 'archived', 'deleted');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE "dedup_policy" AS ENUM('none', 'intra_account', 'intra_workspace', 'custom');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE "upload_session_status" AS ENUM('active', 'uploading', 'committed', 'expired', 'cancelled');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE "asset_actor_type" AS ENUM('user', 'assistant', 'system', 'api');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE "asset_audit_action" AS ENUM('upload_started', 'upload_completed', 'upload_failed', 'upload_cancelled', 'session_expired', 'download', 'preview', 'url_signed', 'state_changed', 'dedup_applied', 'deleted', 'purged', 'archived', 'restored', 'access_denied', 'policy_evaluated', 'metadata_updated', 'linked', 'unlinked');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        console.log('✅ Enums created');

        // Crear tabla assets
        console.log('Creating assets table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "assets" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "account_id" uuid NOT NULL,
                "workspace_id" uuid,
                "scope" "asset_scope" DEFAULT 'message_attachment' NOT NULL,
                "status" "asset_status" DEFAULT 'pending' NOT NULL,
                "version" bigint DEFAULT 1 NOT NULL,
                "name" varchar(500) NOT NULL,
                "original_name" varchar(500),
                "mime_type" varchar(100) DEFAULT 'application/octet-stream',
                "size_bytes" bigint DEFAULT 0,
                "checksum_sha256" varchar(64),
                "dedup_policy" "dedup_policy" DEFAULT 'intra_account' NOT NULL,
                "storage_key" varchar(1000) NOT NULL,
                "storage_provider" varchar(50) DEFAULT 'local',
                "encryption" varchar(50),
                "encryption_key_id" varchar(100),
                "metadata" text,
                "uploaded_by" uuid,
                "created_at" timestamp with time zone DEFAULT now(),
                "updated_at" timestamp with time zone DEFAULT now(),
                "retention_policy" varchar(50),
                "hard_delete_at" timestamp with time zone,
                CONSTRAINT "assets_unique_checksum_account" UNIQUE("account_id","checksum_sha256")
            );
        `);
        console.log('✅ assets table created');

        // Crear tabla asset_upload_sessions
        console.log('Creating asset_upload_sessions table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "asset_upload_sessions" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "account_id" uuid NOT NULL,
                "uploaded_by" uuid,
                "status" "upload_session_status" DEFAULT 'active' NOT NULL,
                "max_size_bytes" bigint DEFAULT 104857600 NOT NULL,
                "allowed_mime_types" text,
                "bytes_uploaded" bigint DEFAULT 0,
                "total_bytes" bigint,
                "chunks_received" bigint DEFAULT 0,
                "temp_storage_key" varchar(1000),
                "file_name" varchar(500),
                "mime_type" varchar(100),
                "asset_id" uuid,
                "expires_at" timestamp with time zone NOT NULL,
                "created_at" timestamp with time zone DEFAULT now(),
                "updated_at" timestamp with time zone DEFAULT now(),
                "committed_at" timestamp with time zone
            );
        `);
        console.log('✅ asset_upload_sessions table created');

        // Crear tabla asset_policies
        console.log('Creating asset_policies table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "asset_policies" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "name" varchar(100) NOT NULL,
                "description" text,
                "scope" varchar(50) NOT NULL,
                "allowed_contexts" text NOT NULL,
                "default_ttl_seconds" integer DEFAULT 3600 NOT NULL,
                "max_ttl_seconds" integer DEFAULT 86400 NOT NULL,
                "dedup_scope" varchar(50) DEFAULT 'intra_account',
                "max_file_size_bytes" integer,
                "allowed_mime_types" text,
                "require_encryption" boolean DEFAULT false,
                "allow_public_access" boolean DEFAULT false,
                "audit_all_access" boolean DEFAULT true,
                "retention_days" integer,
                "account_id" uuid,
                "is_active" boolean DEFAULT true,
                "created_at" timestamp with time zone DEFAULT now(),
                "updated_at" timestamp with time zone DEFAULT now()
            );
        `);
        console.log('✅ asset_policies table created');

        // Crear tabla asset_audit_logs
        console.log('Creating asset_audit_logs table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "asset_audit_logs" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "asset_id" uuid,
                "session_id" uuid,
                "action" "asset_audit_action" NOT NULL,
                "actor_id" uuid,
                "actor_type" "asset_actor_type" DEFAULT 'system' NOT NULL,
                "context" varchar(100),
                "account_id" uuid,
                "metadata" text,
                "ip_address" varchar(45),
                "user_agent" text,
                "success" varchar(10) DEFAULT 'true',
                "error_message" text,
                "timestamp" timestamp with time zone DEFAULT now() NOT NULL
            );
        `);
        console.log('✅ asset_audit_logs table created');

        // Crear tabla message_assets
        console.log('Creating message_assets table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "message_assets" (
                "message_id" uuid NOT NULL,
                "asset_id" uuid NOT NULL,
                "version" integer DEFAULT 1 NOT NULL,
                "position" integer DEFAULT 0 NOT NULL,
                "linked_at" timestamp with time zone DEFAULT now(),
                CONSTRAINT "message_assets_message_id_asset_id_pk" PRIMARY KEY("message_id","asset_id")
            );
        `);
        console.log('✅ message_assets table created');

        // Crear tabla template_assets
        console.log('Creating template_assets table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "template_assets" (
                "template_id" uuid NOT NULL,
                "asset_id" uuid NOT NULL,
                "version" integer DEFAULT 1 NOT NULL,
                "slot" varchar(100) DEFAULT 'default' NOT NULL,
                "linked_at" timestamp with time zone DEFAULT now(),
                CONSTRAINT "template_assets_template_id_asset_id_slot_pk" PRIMARY KEY("template_id","asset_id","slot")
            );
        `);
        console.log('✅ template_assets table created');

        // Crear tabla plan_assets
        console.log('Creating plan_assets table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "plan_assets" (
                "plan_id" uuid NOT NULL,
                "step_id" varchar(100),
                "asset_id" uuid NOT NULL,
                "version" integer DEFAULT 1 NOT NULL,
                "dependency_type" varchar(50) DEFAULT 'required' NOT NULL,
                "is_ready" boolean DEFAULT false,
                "linked_at" timestamp with time zone DEFAULT now(),
                "ready_at" timestamp with time zone,
                CONSTRAINT "plan_assets_plan_id_asset_id_pk" PRIMARY KEY("plan_id","asset_id")
            );
        `);
        console.log('✅ plan_assets table created');

        // Crear índices
        console.log('Creating indexes...');
        
        const indexes = [
            `CREATE INDEX IF NOT EXISTS "idx_assets_account" ON "assets" ("account_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_assets_workspace" ON "assets" ("workspace_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_assets_status" ON "assets" ("status")`,
            `CREATE INDEX IF NOT EXISTS "idx_assets_scope" ON "assets" ("scope")`,
            `CREATE INDEX IF NOT EXISTS "idx_assets_checksum" ON "assets" ("checksum_sha256")`,
            `CREATE INDEX IF NOT EXISTS "idx_assets_created" ON "assets" ("created_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_assets_storage_key" ON "assets" ("storage_key")`,
            `CREATE INDEX IF NOT EXISTS "idx_upload_sessions_account" ON "asset_upload_sessions" ("account_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_upload_sessions_status" ON "asset_upload_sessions" ("status")`,
            `CREATE INDEX IF NOT EXISTS "idx_upload_sessions_expires" ON "asset_upload_sessions" ("expires_at")`,
            `CREATE INDEX IF NOT EXISTS "idx_upload_sessions_asset" ON "asset_upload_sessions" ("asset_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_asset_policies_scope" ON "asset_policies" ("scope")`,
            `CREATE INDEX IF NOT EXISTS "idx_asset_policies_account" ON "asset_policies" ("account_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_asset_policies_active" ON "asset_policies" ("is_active")`,
            `CREATE INDEX IF NOT EXISTS "idx_audit_logs_asset" ON "asset_audit_logs" ("asset_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_audit_logs_session" ON "asset_audit_logs" ("session_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "asset_audit_logs" ("action")`,
            `CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor" ON "asset_audit_logs" ("actor_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_audit_logs_account" ON "asset_audit_logs" ("account_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "asset_audit_logs" ("timestamp")`,
            `CREATE INDEX IF NOT EXISTS "idx_audit_logs_account_timestamp" ON "asset_audit_logs" ("account_id","timestamp")`,
            `CREATE INDEX IF NOT EXISTS "idx_message_assets_message" ON "message_assets" ("message_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_message_assets_asset" ON "message_assets" ("asset_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_template_assets_template" ON "template_assets" ("template_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_template_assets_asset" ON "template_assets" ("asset_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_plan_assets_plan" ON "plan_assets" ("plan_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_plan_assets_step" ON "plan_assets" ("step_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_plan_assets_asset" ON "plan_assets" ("asset_id")`,
            `CREATE INDEX IF NOT EXISTS "idx_plan_assets_ready" ON "plan_assets" ("is_ready")`,
        ];

        for (const idx of indexes) {
            await db.execute(sql.raw(idx));
        }
        console.log('✅ Indexes created');

        console.log('\n🎉 Asset Management migration completed successfully!');
        console.log('Tables created:');
        console.log('  - assets');
        console.log('  - asset_upload_sessions');
        console.log('  - asset_policies');
        console.log('  - asset_audit_logs');
        console.log('  - message_assets');
        console.log('  - template_assets');
        console.log('  - plan_assets');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

runAssetMigration();
