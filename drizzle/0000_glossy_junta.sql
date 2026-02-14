DO $$ BEGIN
 CREATE TYPE "asset_scope" AS ENUM('message_attachment', 'template_asset', 'execution_plan', 'shared_internal', 'profile_avatar', 'workspace_asset');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "asset_status" AS ENUM('pending', 'ready', 'archived', 'deleted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "dedup_policy" AS ENUM('none', 'intra_account', 'intra_workspace', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "upload_session_status" AS ENUM('active', 'uploading', 'committed', 'expired', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "asset_actor_type" AS ENUM('user', 'assistant', 'system', 'api');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "asset_audit_action" AS ENUM('upload_started', 'upload_completed', 'upload_failed', 'upload_cancelled', 'session_expired', 'download', 'preview', 'url_signed', 'state_changed', 'dedup_applied', 'deleted', 'purged', 'archived', 'restored', 'access_denied', 'policy_evaluated', 'metadata_updated', 'linked', 'unlinked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"username" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"private_context" text,
	"alias" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "actors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"account_id" uuid,
	"role" varchar(20),
	"actor_type" varchar(20) NOT NULL,
	"extension_id" varchar(100),
	"display_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_a_id" uuid NOT NULL,
	"account_b_id" uuid NOT NULL,
	"perspective_a" jsonb DEFAULT '{"saved_name":null,"tags":[],"status":"active"}'::jsonb NOT NULL,
	"perspective_b" jsonb DEFAULT '{"saved_name":null,"tags":[],"status":"active"}'::jsonb NOT NULL,
	"context" jsonb DEFAULT '{"entries":[],"total_chars":0}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_interaction" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp,
	"last_message_text" varchar(500),
	"unread_count_a" integer DEFAULT 0 NOT NULL,
	"unread_count_b" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_enrichments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"extension_id" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_account_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"type" varchar(20) NOT NULL,
	"generated_by" varchar(20) DEFAULT 'human' NOT NULL,
	"ai_approved_by" uuid,
	"status" varchar(20) DEFAULT 'synced' NOT NULL,
	"from_actor_id" uuid,
	"to_actor_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"duration_seconds" integer,
	"thumbnail_url" text,
	"waveform_data" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_ai_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"allowed_providers" jsonb DEFAULT '[]'::jsonb,
	"default_provider" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credits_conversation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"feature_key" varchar(60) NOT NULL,
	"engine" varchar(30) NOT NULL,
	"model" varchar(100) NOT NULL,
	"cost_credits" integer NOT NULL,
	"token_budget" integer NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credits_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"entry_type" varchar(30) NOT NULL,
	"feature_key" varchar(60) NOT NULL,
	"engine" varchar(30),
	"model" varchar(100),
	"conversation_id" uuid,
	"session_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credits_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_key" varchar(60) NOT NULL,
	"engine" varchar(30) NOT NULL,
	"model" varchar(100) NOT NULL,
	"cost_credits" integer NOT NULL,
	"token_budget" integer NOT NULL,
	"duration_hours" integer DEFAULT 24 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credits_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_admins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"scopes" jsonb DEFAULT '{"credits":true}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_deletion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"requester_user_id" uuid NOT NULL,
	"requester_account_id" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"phase" varchar(50) DEFAULT 'snapshot' NOT NULL,
	"snapshot_url" text,
	"snapshot_ready_at" timestamp with time zone,
	"snapshot_downloaded_at" timestamp with time zone,
	"snapshot_download_count" integer DEFAULT 0 NOT NULL,
	"snapshot_acknowledged_at" timestamp with time zone,
	"external_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_deletion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"requester_user_id" uuid,
	"requester_account_id" uuid,
	"status" varchar(50) NOT NULL,
	"reason" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "protected_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"reason" text,
	"enforced_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extension_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"extension_id" varchar(100) NOT NULL,
	"version" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"granted_permissions" jsonb DEFAULT '[]'::jsonb,
	"granted_by" uuid,
	"can_share_permissions" boolean DEFAULT true,
	"permissions_granted_at" timestamp DEFAULT now(),
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extension_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extension_id" varchar(100) NOT NULL,
	"account_id" uuid,
	"relationship_id" uuid,
	"conversation_id" uuid,
	"context_type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'operator' NOT NULL,
	"token" varchar(100) NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"invited_by" uuid,
	"invited_at" timestamp,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"relationship_id" uuid,
	"mode" varchar(20) DEFAULT 'supervised' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"availability" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"service_id" uuid,
	"staff_id" uuid,
	"client_account_id" uuid,
	"client_name" varchar(255),
	"client_email" varchar(255),
	"client_phone" varchar(50),
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "website_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_build_at" timestamp,
	"build_hash" varchar(64),
	"published_at" timestamp,
	"custom_domain" varchar(255),
	"custom_domain_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "website_configs_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_assistants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"external_id" varchar(255),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"runtime" varchar(20) DEFAULT 'local' NOT NULL,
	"model_config" jsonb DEFAULT '{"provider":"openai","model":"gpt-4o","temperature":0.7,"topP":1,"responseFormat":"text"}'::jsonb NOT NULL,
	"timing_config" jsonb DEFAULT '{"responseDelaySeconds":2,"smartDelay":true}'::jsonb NOT NULL,
	"size_bytes" integer DEFAULT 0,
	"tokens_used" integer DEFAULT 0,
	"last_modified_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"visibility" varchar(20) DEFAULT 'private' NOT NULL,
	"current_version_id" uuid,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"is_managed" boolean DEFAULT false NOT NULL,
	"last_modified_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_instruction_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instruction_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"content" text NOT NULL,
	"size_bytes" integer DEFAULT 0,
	"tokens_estimated" integer DEFAULT 0,
	"word_count" integer DEFAULT 0,
	"line_count" integer DEFAULT 0,
	"change_log" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_vector_store_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vector_store_id" uuid NOT NULL,
	"file_id" uuid,
	"name" varchar(255) NOT NULL,
	"external_id" varchar(255),
	"mime_type" varchar(100),
	"size_bytes" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb,
	"chunking_strategy" jsonb,
	"usage_bytes" bigint DEFAULT 0,
	"last_error" jsonb,
	"error_message" text,
	"chunk_count" integer DEFAULT 0,
	"last_modified_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_vector_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"external_id" varchar(255),
	"visibility" varchar(20) DEFAULT 'private' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"backend" varchar(20) DEFAULT 'local' NOT NULL,
	"source" varchar(20) DEFAULT 'primary' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"file_counts" jsonb DEFAULT '{"in_progress":0,"completed":0,"failed":0,"cancelled":0,"total":0}'::jsonb,
	"expires_after" jsonb,
	"last_active_at" timestamp with time zone,
	"usage_bytes" bigint DEFAULT 0,
	"expiration_policy" varchar(50) DEFAULT 'never',
	"expiration_days" integer,
	"expires_at" timestamp,
	"usage" jsonb DEFAULT '{"bytesUsed":0,"hoursUsedThisMonth":0,"costPerGBPerDay":0.1}'::jsonb NOT NULL,
	"size_bytes" integer DEFAULT 0,
	"file_count" integer DEFAULT 0,
	"last_modified_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_assistant_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assistant_id" uuid NOT NULL,
	"tool_connection_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_tool_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"tool_definition_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'disconnected' NOT NULL,
	"error_message" text,
	"auth_config" jsonb DEFAULT '{"type":"none"}'::jsonb NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_tool_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"icon" varchar(100),
	"type" varchar(20) DEFAULT 'internal' NOT NULL,
	"visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"schema" jsonb,
	"auth_type" varchar(20) DEFAULT 'none' NOT NULL,
	"oauth_provider" varchar(100),
	"is_built_in" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fluxcore_tool_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_assistant_instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assistant_id" uuid NOT NULL,
	"instruction_id" uuid NOT NULL,
	"version_id" varchar(100),
	"order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_assistant_vector_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assistant_id" uuid NOT NULL,
	"vector_store_id" uuid NOT NULL,
	"access_mode" varchar(20) DEFAULT 'read' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vector_store_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"start_char" integer,
	"end_char" integer,
	"page_number" integer,
	"section_title" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_asset_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vector_store_id" uuid,
	"instruction_id" uuid,
	"tool_definition_id" uuid,
	"grantee_account_id" uuid NOT NULL,
	"permission_level" varchar(20) DEFAULT 'read' NOT NULL,
	"source" varchar(20) DEFAULT 'shared' NOT NULL,
	"granted_by_account_id" uuid NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_rag_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vector_store_id" uuid,
	"account_id" uuid,
	"name" varchar(100),
	"is_default" boolean DEFAULT false,
	"chunking_strategy" varchar(50) DEFAULT 'recursive' NOT NULL,
	"chunk_size_tokens" integer DEFAULT 512,
	"chunk_overlap_tokens" integer DEFAULT 50,
	"chunk_separators" jsonb DEFAULT '["\n\n","\n",". "," "]'::jsonb,
	"chunk_custom_regex" text,
	"min_chunk_size" integer DEFAULT 50,
	"max_chunk_size" integer DEFAULT 2000,
	"embedding_provider" varchar(50) DEFAULT 'openai' NOT NULL,
	"embedding_model" varchar(100) DEFAULT 'text-embedding-3-small',
	"embedding_dimensions" integer DEFAULT 1536,
	"embedding_batch_size" integer DEFAULT 100,
	"embedding_endpoint_url" text,
	"embedding_api_key_ref" varchar(255),
	"retrieval_top_k" integer DEFAULT 10,
	"retrieval_min_score" numeric(4, 3) DEFAULT '0.700',
	"retrieval_max_tokens" integer DEFAULT 2000,
	"hybrid_search_enabled" boolean DEFAULT false,
	"hybrid_keyword_weight" numeric(3, 2) DEFAULT '0.30',
	"rerank_enabled" boolean DEFAULT false,
	"rerank_provider" varchar(50),
	"rerank_model" varchar(100),
	"rerank_top_n" integer DEFAULT 5,
	"supported_mime_types" jsonb DEFAULT '["application/pdf","text/plain","text/markdown","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]'::jsonb,
	"ocr_enabled" boolean DEFAULT false,
	"ocr_language" varchar(10) DEFAULT 'spa',
	"extract_metadata" boolean DEFAULT true,
	"metadata_fields" jsonb DEFAULT '["title","author","created_date","page_count"]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vector_store_id" uuid,
	"instruction_id" uuid,
	"tool_definition_id" uuid,
	"seller_account_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"short_description" varchar(500),
	"long_description" text,
	"category" varchar(100),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"pricing_model" varchar(20) DEFAULT 'free' NOT NULL,
	"price_cents" integer DEFAULT 0,
	"currency" varchar(3) DEFAULT 'USD',
	"billing_period" varchar(20),
	"usage_price_per_1k_tokens" integer,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_subscribers" integer DEFAULT 0,
	"total_revenue_cents" bigint DEFAULT 0,
	"total_queries" bigint DEFAULT 0,
	"rating_average" numeric(3, 2),
	"rating_count" integer DEFAULT 0,
	"preview_enabled" boolean DEFAULT true,
	"preview_chunk_limit" integer DEFAULT 5,
	"license_type" varchar(50) DEFAULT 'personal',
	"terms_url" text,
	"cover_image_url" text,
	"screenshots" jsonb DEFAULT '[]'::jsonb,
	"demo_url" text,
	"search_keywords" jsonb DEFAULT '[]'::jsonb,
	"featured" boolean DEFAULT false,
	"featured_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_marketplace_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"reviewer_account_id" uuid NOT NULL,
	"subscription_id" uuid,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"content" text,
	"status" varchar(20) DEFAULT 'published',
	"helpful_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_marketplace_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"subscriber_account_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"tokens_used_this_period" bigint DEFAULT 0,
	"queries_this_period" integer DEFAULT 0,
	"tokens_used_total" bigint DEFAULT 0,
	"queries_total" integer DEFAULT 0,
	"external_subscription_id" varchar(255),
	"last_payment_at" timestamp,
	"next_payment_at" timestamp,
	"total_paid_cents" bigint DEFAULT 0,
	"access_mode" varchar(20) DEFAULT 'read',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_account_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"balance_credits" numeric(12, 4) DEFAULT '0',
	"monthly_limit_credits" numeric(12, 4),
	"daily_limit_credits" numeric(12, 4),
	"used_this_month" numeric(12, 4) DEFAULT '0',
	"used_today" numeric(12, 4) DEFAULT '0',
	"plan_type" varchar(50) DEFAULT 'free',
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"alert_threshold_percent" integer DEFAULT 80,
	"last_alert_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"amount_credits" numeric(12, 4) NOT NULL,
	"description" text,
	"usage_log_id" uuid,
	"subscription_id" uuid,
	"stripe_payment_intent_id" varchar(255),
	"balance_after" numeric(12, 4),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"operation" varchar(50) NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"chunks_processed" integer DEFAULT 0,
	"api_calls" integer DEFAULT 1,
	"processing_time_ms" integer DEFAULT 0,
	"cost_credits" numeric(10, 4) DEFAULT '0',
	"provider" varchar(50),
	"model" varchar(100),
	"request_metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"billing_period_start" date,
	"billing_period_end" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"original_name" varchar(500),
	"mime_type" varchar(100) DEFAULT 'application/octet-stream',
	"size_bytes" bigint DEFAULT 0,
	"text_content" text,
	"content_hash" varchar(64),
	"account_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "fluxcore_files_unique_hash" UNIQUE("account_id","content_hash")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_assets" (
	"message_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "message_assets_message_id_asset_id_pk" PRIMARY KEY("message_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "template_assets" (
	"template_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"slot" varchar(100) DEFAULT 'default' NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "template_assets_template_id_asset_id_slot_pk" PRIMARY KEY("template_id","asset_id","slot")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100),
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_template_settings" (
	"template_id" uuid PRIMARY KEY NOT NULL,
	"authorize_for_ai" boolean DEFAULT false NOT NULL,
	"ai_usage_instructions" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_traces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"runtime" varchar(20) NOT NULL,
	"provider" varchar(20) NOT NULL,
	"model" varchar(100) NOT NULL,
	"mode" varchar(20) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"prompt_tokens" integer DEFAULT 0,
	"completion_tokens" integer DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"request_body" jsonb,
	"response_content" text,
	"tools_offered" jsonb DEFAULT '[]'::jsonb,
	"tools_called" jsonb DEFAULT '[]'::jsonb,
	"tool_details" jsonb,
	"attempts" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"conversation_id" uuid,
	"relationship_id" uuid,
	"signal_type" varchar(30) NOT NULL,
	"signal_value" varchar(100) NOT NULL,
	"confidence" real DEFAULT 1,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"content" text NOT NULL,
	"model" varchar(100) NOT NULL,
	"provider" varchar(20),
	"base_url" varchar(255),
	"trace_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"prompt_tokens" integer DEFAULT 0,
	"completion_tokens" integer DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_agent_assistants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"assistant_id" uuid NOT NULL,
	"role" varchar(30) DEFAULT 'worker' NOT NULL,
	"step_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"flow" jsonb DEFAULT '{"steps":[]}'::jsonb NOT NULL,
	"scopes" jsonb DEFAULT '{"allowedModels":[],"maxTotalTokens":5000,"maxExecutionTimeMs":30000,"allowedTools":[],"canCreateSubAgents":false}'::jsonb NOT NULL,
	"trigger_config" jsonb DEFAULT '{"type":"message_received"}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_decision_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"trace_id" varchar(255) NOT NULL,
	"message_id" uuid,
	"input" jsonb NOT NULL,
	"proposed_work" jsonb,
	"model_info" jsonb,
	"latency_ms" integer,
	"tokens" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_external_effect_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"semantic_context_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"effect_type" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"tool_call_id" varchar(255),
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp,
	"external_effect_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_external_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"tool_name" varchar(255) NOT NULL,
	"tool_call_id" varchar(255),
	"idempotency_key" varchar(255) NOT NULL,
	"request" jsonb,
	"response" jsonb,
	"status" varchar(20) NOT NULL,
	"claim_id" uuid,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	CONSTRAINT "fluxcore_external_effects_account_id_idempotency_key_unique" UNIQUE("account_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_proposed_works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"conversation_id" varchar(255) NOT NULL,
	"decision_event_id" uuid NOT NULL,
	"work_definition_id" uuid,
	"intent" text,
	"candidate_slots" jsonb NOT NULL,
	"confidence" real,
	"trace_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"evaluated_at" timestamp,
	"resolution" varchar(50) NOT NULL,
	"resulting_work_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_semantic_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"work_id" uuid,
	"conversation_id" varchar(255) NOT NULL,
	"slot_path" text NOT NULL,
	"proposed_value" jsonb NOT NULL,
	"request_message_id" uuid,
	"request_event_id" uuid,
	"status" varchar(20) NOT NULL,
	"consumed_at" timestamp,
	"consumed_by_work_id" uuid,
	"consumed_by_message_id" uuid,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_work_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type_id" text NOT NULL,
	"version" varchar(20) NOT NULL,
	"definition_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deprecated_at" timestamp,
	CONSTRAINT "fluxcore_work_definitions_account_id_type_id_version_unique" UNIQUE("account_id","type_id","version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_work_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"actor" varchar(50) NOT NULL,
	"trace_id" varchar(255) NOT NULL,
	"work_revision" integer NOT NULL,
	"delta" jsonb,
	"evidence_ref" jsonb,
	"semantic_context_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_work_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"path" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"value" jsonb,
	"status" varchar(20) NOT NULL,
	"immutable" boolean DEFAULT false NOT NULL,
	"set_by" varchar(50) NOT NULL,
	"set_at" timestamp DEFAULT now() NOT NULL,
	"evidence" jsonb,
	"semantic_confirmed_at" timestamp,
	"semantic_context_id" uuid,
	CONSTRAINT "fluxcore_work_slots_work_id_path_unique" UNIQUE("work_id","path")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fluxcore_works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"work_definition_id" uuid NOT NULL,
	"work_definition_version" varchar(20) NOT NULL,
	"relationship_id" uuid,
	"conversation_id" varchar(255),
	"aggregate_key" text,
	"state" varchar(50) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp,
	"suspended_reason" text,
	"cancelled_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_runtime_config" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"active_runtime_id" varchar(100) DEFAULT '@fluxcore/fluxcore' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attachments_message" ON "media_attachments" ("message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attachments_type" ON "media_attachments" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_conversation_sessions_account" ON "credits_conversation_sessions" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_conversation_sessions_conversation" ON "credits_conversation_sessions" ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_conversation_sessions_feature" ON "credits_conversation_sessions" ("feature_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_conversation_sessions_expires_at" ON "credits_conversation_sessions" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_ledger_account" ON "credits_ledger" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_ledger_created_at" ON "credits_ledger" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_policies_feature" ON "credits_policies" ("feature_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_policies_engine_model" ON "credits_policies" ("engine","model");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credits_wallets_account_unique" ON "credits_wallets" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_wallets_account" ON "credits_wallets" ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_chunks_file_chunk" ON "fluxcore_document_chunks" ("file_id","chunk_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_document_chunks_vector_store_drizzle" ON "fluxcore_document_chunks" ("vector_store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_document_chunks_file_drizzle" ON "fluxcore_document_chunks" ("file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_document_chunks_account_drizzle" ON "fluxcore_document_chunks" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asset_permissions_grantee_drizzle" ON "fluxcore_asset_permissions" ("grantee_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asset_permissions_source_drizzle" ON "fluxcore_asset_permissions" ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_config_vs_drizzle" ON "fluxcore_rag_configurations" ("vector_store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_config_account_drizzle" ON "fluxcore_rag_configurations" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mp_listings_seller" ON "fluxcore_marketplace_listings" ("seller_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mp_listings_status" ON "fluxcore_marketplace_listings" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mp_listings_category" ON "fluxcore_marketplace_listings" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mp_reviews_listing" ON "fluxcore_marketplace_reviews" ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mp_review_unique" ON "fluxcore_marketplace_reviews" ("listing_id","reviewer_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mp_subscriptions_subscriber" ON "fluxcore_marketplace_subscriptions" ("subscriber_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mp_subscriptions_listing" ON "fluxcore_marketplace_subscriptions" ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mp_sub_unique" ON "fluxcore_marketplace_subscriptions" ("listing_id","subscriber_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_credits_account_unique" ON "fluxcore_account_credits" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_account_drizzle" ON "fluxcore_credit_transactions" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_type_drizzle" ON "fluxcore_credit_transactions" ("transaction_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_logs_account_drizzle" ON "fluxcore_usage_logs" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_logs_resource_drizzle" ON "fluxcore_usage_logs" ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_logs_created_drizzle" ON "fluxcore_usage_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fluxcore_files_account" ON "fluxcore_files" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fluxcore_files_name" ON "fluxcore_files" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fluxcore_files_hash" ON "fluxcore_files" ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fluxcore_files_created" ON "fluxcore_files" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_account" ON "assets" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_workspace" ON "assets" ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_status" ON "assets" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_scope" ON "assets" ("scope");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_checksum" ON "assets" ("checksum_sha256");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_created" ON "assets" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_storage_key" ON "assets" ("storage_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_upload_sessions_account" ON "asset_upload_sessions" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_upload_sessions_status" ON "asset_upload_sessions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_upload_sessions_expires" ON "asset_upload_sessions" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_upload_sessions_asset" ON "asset_upload_sessions" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asset_policies_scope" ON "asset_policies" ("scope");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asset_policies_account" ON "asset_policies" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asset_policies_active" ON "asset_policies" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_asset" ON "asset_audit_logs" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_session" ON "asset_audit_logs" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "asset_audit_logs" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor" ON "asset_audit_logs" ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_account" ON "asset_audit_logs" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "asset_audit_logs" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_account_timestamp" ON "asset_audit_logs" ("account_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_assets_message" ON "message_assets" ("message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_assets_asset" ON "message_assets" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_template_assets_template" ON "template_assets" ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_template_assets_asset" ON "template_assets" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plan_assets_plan" ON "plan_assets" ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plan_assets_step" ON "plan_assets" ("step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plan_assets_asset" ON "plan_assets" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plan_assets_ready" ON "plan_assets" ("is_ready");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_templates_account" ON "templates" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_templates_account_name" ON "templates" ("account_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_traces_account" ON "ai_traces" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_traces_conversation" ON "ai_traces" ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_traces_created_at" ON "ai_traces" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_signals_account" ON "ai_signals" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_signals_type_value" ON "ai_signals" ("signal_type","signal_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_signals_conversation" ON "ai_signals" ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_signals_created_at" ON "ai_signals" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_conversation" ON "ai_suggestions" ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_account" ON "ai_suggestions" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_status" ON "ai_suggestions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_created_at" ON "ai_suggestions" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fluxcore_semantic_contexts_acc_conv_status_idx" ON "fluxcore_semantic_contexts" ("account_id","conversation_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fluxcore_work_events_work_created_idx" ON "fluxcore_work_events" ("work_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fluxcore_works_acc_rel_conv_state_idx" ON "fluxcore_works" ("account_id","relationship_id","conversation_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fluxcore_works_acc_aggregate_key_idx" ON "fluxcore_works" ("account_id","aggregate_key");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actors" ADD CONSTRAINT "actors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actors" ADD CONSTRAINT "actors_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relationships" ADD CONSTRAINT "relationships_account_a_id_accounts_id_fk" FOREIGN KEY ("account_a_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relationships" ADD CONSTRAINT "relationships_account_b_id_accounts_id_fk" FOREIGN KEY ("account_b_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_enrichments" ADD CONSTRAINT "message_enrichments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_account_id_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_ai_approved_by_users_id_fk" FOREIGN KEY ("ai_approved_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_from_actor_id_actors_id_fk" FOREIGN KEY ("from_actor_id") REFERENCES "actors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_to_actor_id_actors_id_fk" FOREIGN KEY ("to_actor_id") REFERENCES "actors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_ai_entitlements" ADD CONSTRAINT "account_ai_entitlements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credits_conversation_sessions" ADD CONSTRAINT "credits_conversation_sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credits_conversation_sessions" ADD CONSTRAINT "credits_conversation_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credits_wallets" ADD CONSTRAINT "credits_wallets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_admins" ADD CONSTRAINT "system_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_admins" ADD CONSTRAINT "system_admins_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_deletion_jobs" ADD CONSTRAINT "account_deletion_jobs_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_deletion_jobs" ADD CONSTRAINT "account_deletion_jobs_requester_account_id_accounts_id_fk" FOREIGN KEY ("requester_account_id") REFERENCES "accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_deletion_logs" ADD CONSTRAINT "account_deletion_logs_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_deletion_logs" ADD CONSTRAINT "account_deletion_logs_requester_account_id_accounts_id_fk" FOREIGN KEY ("requester_account_id") REFERENCES "accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protected_accounts" ADD CONSTRAINT "protected_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protected_accounts" ADD CONSTRAINT "protected_accounts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_installations" ADD CONSTRAINT "extension_installations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_installations" ADD CONSTRAINT "extension_installations_granted_by_accounts_id_fk" FOREIGN KEY ("granted_by") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_contexts" ADD CONSTRAINT "extension_contexts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_contexts" ADD CONSTRAINT "extension_contexts_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extension_contexts" ADD CONSTRAINT "extension_contexts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_staff" ADD CONSTRAINT "appointment_staff_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_appointment_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "appointment_services"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_appointment_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "appointment_staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_account_id_accounts_id_fk" FOREIGN KEY ("client_account_id") REFERENCES "accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website_configs" ADD CONSTRAINT "website_configs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_assistants" ADD CONSTRAINT "fluxcore_assistants_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_instructions" ADD CONSTRAINT "fluxcore_instructions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_instruction_versions" ADD CONSTRAINT "fluxcore_instruction_versions_instruction_id_fluxcore_instructions_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "fluxcore_instructions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_vector_store_files" ADD CONSTRAINT "fluxcore_vector_store_files_vector_store_id_fluxcore_vector_stores_id_fk" FOREIGN KEY ("vector_store_id") REFERENCES "fluxcore_vector_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_vector_stores" ADD CONSTRAINT "fluxcore_vector_stores_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_assistant_tools" ADD CONSTRAINT "fluxcore_assistant_tools_tool_connection_id_fluxcore_tool_connections_id_fk" FOREIGN KEY ("tool_connection_id") REFERENCES "fluxcore_tool_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_tool_connections" ADD CONSTRAINT "fluxcore_tool_connections_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_tool_connections" ADD CONSTRAINT "fluxcore_tool_connections_tool_definition_id_fluxcore_tool_definitions_id_fk" FOREIGN KEY ("tool_definition_id") REFERENCES "fluxcore_tool_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_assistant_instructions" ADD CONSTRAINT "fluxcore_assistant_instructions_assistant_id_fluxcore_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "fluxcore_assistants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_assistant_instructions" ADD CONSTRAINT "fluxcore_assistant_instructions_instruction_id_fluxcore_instructions_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "fluxcore_instructions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_assistant_vector_stores" ADD CONSTRAINT "fluxcore_assistant_vector_stores_assistant_id_fluxcore_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "fluxcore_assistants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_assistant_vector_stores" ADD CONSTRAINT "fluxcore_assistant_vector_stores_vector_store_id_fluxcore_vector_stores_id_fk" FOREIGN KEY ("vector_store_id") REFERENCES "fluxcore_vector_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_document_chunks" ADD CONSTRAINT "fluxcore_document_chunks_vector_store_id_fluxcore_vector_stores_id_fk" FOREIGN KEY ("vector_store_id") REFERENCES "fluxcore_vector_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_document_chunks" ADD CONSTRAINT "fluxcore_document_chunks_file_id_fluxcore_vector_store_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "fluxcore_vector_store_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_document_chunks" ADD CONSTRAINT "fluxcore_document_chunks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_asset_permissions" ADD CONSTRAINT "fluxcore_asset_permissions_vector_store_id_fluxcore_vector_stores_id_fk" FOREIGN KEY ("vector_store_id") REFERENCES "fluxcore_vector_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_asset_permissions" ADD CONSTRAINT "fluxcore_asset_permissions_instruction_id_fluxcore_instructions_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "fluxcore_instructions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_asset_permissions" ADD CONSTRAINT "fluxcore_asset_permissions_tool_definition_id_fluxcore_tool_definitions_id_fk" FOREIGN KEY ("tool_definition_id") REFERENCES "fluxcore_tool_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_asset_permissions" ADD CONSTRAINT "fluxcore_asset_permissions_grantee_account_id_accounts_id_fk" FOREIGN KEY ("grantee_account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_asset_permissions" ADD CONSTRAINT "fluxcore_asset_permissions_granted_by_account_id_accounts_id_fk" FOREIGN KEY ("granted_by_account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_rag_configurations" ADD CONSTRAINT "fluxcore_rag_configurations_vector_store_id_fluxcore_vector_stores_id_fk" FOREIGN KEY ("vector_store_id") REFERENCES "fluxcore_vector_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_rag_configurations" ADD CONSTRAINT "fluxcore_rag_configurations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_listings" ADD CONSTRAINT "fluxcore_marketplace_listings_vector_store_id_fluxcore_vector_stores_id_fk" FOREIGN KEY ("vector_store_id") REFERENCES "fluxcore_vector_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_listings" ADD CONSTRAINT "fluxcore_marketplace_listings_instruction_id_fluxcore_instructions_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "fluxcore_instructions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_listings" ADD CONSTRAINT "fluxcore_marketplace_listings_tool_definition_id_fluxcore_tool_definitions_id_fk" FOREIGN KEY ("tool_definition_id") REFERENCES "fluxcore_tool_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_listings" ADD CONSTRAINT "fluxcore_marketplace_listings_seller_account_id_accounts_id_fk" FOREIGN KEY ("seller_account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_reviews" ADD CONSTRAINT "fluxcore_marketplace_reviews_listing_id_fluxcore_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "fluxcore_marketplace_listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_reviews" ADD CONSTRAINT "fluxcore_marketplace_reviews_reviewer_account_id_accounts_id_fk" FOREIGN KEY ("reviewer_account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_reviews" ADD CONSTRAINT "fluxcore_marketplace_reviews_subscription_id_fluxcore_marketplace_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "fluxcore_marketplace_subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_subscriptions" ADD CONSTRAINT "fluxcore_marketplace_subscriptions_listing_id_fluxcore_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "fluxcore_marketplace_listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_marketplace_subscriptions" ADD CONSTRAINT "fluxcore_marketplace_subscriptions_subscriber_account_id_accounts_id_fk" FOREIGN KEY ("subscriber_account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_account_credits" ADD CONSTRAINT "fluxcore_account_credits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_credit_transactions" ADD CONSTRAINT "fluxcore_credit_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_credit_transactions" ADD CONSTRAINT "fluxcore_credit_transactions_usage_log_id_fluxcore_usage_logs_id_fk" FOREIGN KEY ("usage_log_id") REFERENCES "fluxcore_usage_logs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_credit_transactions" ADD CONSTRAINT "fluxcore_credit_transactions_subscription_id_fluxcore_marketplace_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "fluxcore_marketplace_subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_usage_logs" ADD CONSTRAINT "fluxcore_usage_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "templates" ADD CONSTRAINT "templates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_template_settings" ADD CONSTRAINT "fluxcore_template_settings_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_traces" ADD CONSTRAINT "ai_traces_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_traces" ADD CONSTRAINT "ai_traces_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_traces" ADD CONSTRAINT "ai_traces_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_signals" ADD CONSTRAINT "ai_signals_trace_id_ai_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "ai_traces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_signals" ADD CONSTRAINT "ai_signals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_signals" ADD CONSTRAINT "ai_signals_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_signals" ADD CONSTRAINT "ai_signals_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_agent_assistants" ADD CONSTRAINT "fluxcore_agent_assistants_agent_id_fluxcore_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "fluxcore_agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_agent_assistants" ADD CONSTRAINT "fluxcore_agent_assistants_assistant_id_fluxcore_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "fluxcore_assistants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_agents" ADD CONSTRAINT "fluxcore_agents_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_decision_events" ADD CONSTRAINT "fluxcore_decision_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_external_effect_claims" ADD CONSTRAINT "fluxcore_external_effect_claims_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_external_effect_claims" ADD CONSTRAINT "fluxcore_external_effect_claims_semantic_context_id_fluxcore_semantic_contexts_id_fk" FOREIGN KEY ("semantic_context_id") REFERENCES "fluxcore_semantic_contexts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_external_effect_claims" ADD CONSTRAINT "fluxcore_external_effect_claims_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_external_effect_claims" ADD CONSTRAINT "fluxcore_external_effect_claims_external_effect_id_fluxcore_external_effects_id_fk" FOREIGN KEY ("external_effect_id") REFERENCES "fluxcore_external_effects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_external_effects" ADD CONSTRAINT "fluxcore_external_effects_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_external_effects" ADD CONSTRAINT "fluxcore_external_effects_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_proposed_works" ADD CONSTRAINT "fluxcore_proposed_works_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_proposed_works" ADD CONSTRAINT "fluxcore_proposed_works_decision_event_id_fluxcore_decision_events_id_fk" FOREIGN KEY ("decision_event_id") REFERENCES "fluxcore_decision_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_proposed_works" ADD CONSTRAINT "fluxcore_proposed_works_work_definition_id_fluxcore_work_definitions_id_fk" FOREIGN KEY ("work_definition_id") REFERENCES "fluxcore_work_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_semantic_contexts" ADD CONSTRAINT "fluxcore_semantic_contexts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_semantic_contexts" ADD CONSTRAINT "fluxcore_semantic_contexts_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_work_definitions" ADD CONSTRAINT "fluxcore_work_definitions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_work_events" ADD CONSTRAINT "fluxcore_work_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_work_events" ADD CONSTRAINT "fluxcore_work_events_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_work_slots" ADD CONSTRAINT "fluxcore_work_slots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_work_slots" ADD CONSTRAINT "fluxcore_work_slots_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_works" ADD CONSTRAINT "fluxcore_works_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_works" ADD CONSTRAINT "fluxcore_works_work_definition_id_fluxcore_work_definitions_id_fk" FOREIGN KEY ("work_definition_id") REFERENCES "fluxcore_work_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fluxcore_works" ADD CONSTRAINT "fluxcore_works_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_runtime_config" ADD CONSTRAINT "account_runtime_config_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
