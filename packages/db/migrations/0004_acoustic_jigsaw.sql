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
ALTER TABLE "fluxcore_assistants" ADD COLUMN "runtime" varchar(20) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_store_files" ADD COLUMN "file_id" uuid;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_store_files" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_store_files" ADD COLUMN "chunking_strategy" jsonb;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_store_files" ADD COLUMN "usage_bytes" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_store_files" ADD COLUMN "last_error" jsonb;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_store_files" ADD COLUMN "chunk_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_stores" ADD COLUMN "backend" varchar(20) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_stores" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_stores" ADD COLUMN "file_counts" jsonb DEFAULT '{"in_progress":0,"completed":0,"failed":0,"cancelled":0,"total":0}'::jsonb;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_stores" ADD COLUMN "expires_after" jsonb;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_stores" ADD COLUMN "last_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fluxcore_vector_stores" ADD COLUMN "usage_bytes" bigint DEFAULT 0;--> statement-breakpoint
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
