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
ALTER TABLE "templates" DROP COLUMN IF EXISTS "authorize_for_ai";--> statement-breakpoint
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
