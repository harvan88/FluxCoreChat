-- ---------------------------------------------------------------------------
-- ChatCore Redesign v1.3 · Workstream 1 (Schema Guardrails)
-- Adds participants/enrichments tables and aligns conversations/messages.
-- All statements are idempotent to respect existing prod state.
-- ---------------------------------------------------------------------------

-- 1. Conversation Participants (source of truth for sockets/windows)
CREATE TABLE IF NOT EXISTS "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'initiator' NOT NULL,
	"identity_type" varchar(20) DEFAULT 'registered' NOT NULL,
	"visitor_token" text,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "conversation_participants_role_valid" CHECK (role IN ('initiator','recipient','observer')),
	CONSTRAINT "conversation_participants_identity_valid" CHECK (identity_type IN ('registered','anonymous','system'))
);

ALTER TABLE "conversation_participants"
	ADD COLUMN IF NOT EXISTS "conversation_id" uuid,
	ADD COLUMN IF NOT EXISTS "account_id" uuid;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'conversation_participants_conversation_id_conversations_id_fk'
	) THEN
		ALTER TABLE "conversation_participants"
			ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk"
			FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'conversation_participants_account_id_accounts_id_fk'
	) THEN
		ALTER TABLE "conversation_participants"
			ADD CONSTRAINT "conversation_participants_account_id_accounts_id_fk"
			FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
	END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_conversation_participants_account"
	ON "conversation_participants" ("conversation_id","account_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_conversation"
	ON "conversation_participants" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_account"
	ON "conversation_participants" ("account_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_token"
	ON "conversation_participants" ("visitor_token");

-- 2. Asset Enrichments (single source for transcriptions/captions)
CREATE TABLE IF NOT EXISTS "asset_enrichments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'asset_enrichments_asset_id_assets_id_fk'
	) THEN
		ALTER TABLE "asset_enrichments"
			ADD CONSTRAINT "asset_enrichments_asset_id_assets_id_fk"
			FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE;
	END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_asset_enrichments_type"
	ON "asset_enrichments" ("asset_id","type");
CREATE INDEX IF NOT EXISTS "idx_asset_enrichments_asset"
	ON "asset_enrichments" ("asset_id");

-- 3. Conversations guardrails (frozen windows + metadata)
ALTER TABLE "conversations"
	ALTER COLUMN "relationship_id" DROP NOT NULL,
	ALTER COLUMN "channel" TYPE varchar(32),
	ALTER COLUMN "channel" SET DEFAULT 'web',
	ADD COLUMN IF NOT EXISTS "owner_account_id" uuid,
	ADD COLUMN IF NOT EXISTS "conversation_type" varchar(32) DEFAULT 'internal' NOT NULL,
	ADD COLUMN IF NOT EXISTS "frozen_at" timestamp,
	ADD COLUMN IF NOT EXISTS "frozen_reason" text,
	ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	ADD COLUMN IF NOT EXISTS "visitor_token" text,
	ADD COLUMN IF NOT EXISTS "identity_linked_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "linked_account_id" text;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_owner_account_id_accounts_id_fk') THEN
		ALTER TABLE "conversations"
			ADD CONSTRAINT "conversations_owner_account_id_accounts_id_fk"
			FOREIGN KEY ("owner_account_id") REFERENCES "accounts"("id");
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_type_valid') THEN
		ALTER TABLE "conversations"
			ADD CONSTRAINT "conversation_type_valid" CHECK (conversation_type IN ('internal','anonymous_thread','external'));
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_channel_valid') THEN
		ALTER TABLE "conversations"
			ADD CONSTRAINT "conversation_channel_valid" CHECK (channel IN ('web','whatsapp','telegram','webchat','external'));
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_status_valid') THEN
		ALTER TABLE "conversations"
			ADD CONSTRAINT "conversation_status_valid" CHECK (status IN ('active','archived','closed'));
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_conversations_visitor_token"
	ON "conversations" ("visitor_token");

-- 4. Messages contract (versioning, deletion, metadata)
ALTER TABLE "messages"
	ADD COLUMN IF NOT EXISTS "event_type" varchar(20) DEFAULT 'message' NOT NULL,
	ADD COLUMN IF NOT EXISTS "parent_id" uuid,
	ADD COLUMN IF NOT EXISTS "original_id" uuid,
	ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
	ADD COLUMN IF NOT EXISTS "is_current" boolean DEFAULT true NOT NULL,
	ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "deleted_by" text,
	ADD COLUMN IF NOT EXISTS "deleted_scope" varchar(10),
	ADD COLUMN IF NOT EXISTS "signal_id" bigint,
	ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;

DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_deleted_scope_valid') THEN
		ALTER TABLE "messages"
			ADD CONSTRAINT "message_deleted_scope_valid"
			CHECK ("deleted_scope" IS NULL OR "deleted_scope" IN ('self','all'));
	END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ux_messages_signal_id"
	ON "messages" ("signal_id");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation"
	ON "messages" ("conversation_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_messages_parent"
	ON "messages" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_messages_original"
	ON "messages" ("original_id");
CREATE INDEX IF NOT EXISTS "idx_messages_metadata"
	ON "messages" USING GIN ("metadata");

-- 5. Relationships guardrail (no self-relationships)
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_self_relationship') THEN
		ALTER TABLE "relationships"
			ADD CONSTRAINT "no_self_relationship" CHECK ("account_a_id" <> "account_b_id");
	END IF;
END $$;
