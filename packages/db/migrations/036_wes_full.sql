-- Core WES Infrastructure Tables (WES-130)

-- 1. fluxcore_work_definitions
CREATE TABLE IF NOT EXISTS "fluxcore_work_definitions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "account_id" uuid NOT NULL,
    "type_id" text NOT NULL,
    "version" varchar(20) NOT NULL,
    "definition_json" jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "deprecated_at" timestamp,
    UNIQUE ("account_id", "type_id", "version")
);

-- 2. fluxcore_works
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

-- 3. fluxcore_work_slots
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
    UNIQUE ("work_id", "path")
);

-- 4. fluxcore_work_events
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

-- 5. fluxcore_semantic_contexts
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

-- 6. fluxcore_external_effects
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
    UNIQUE ("account_id", "idempotency_key")
);

-- 7. fluxcore_external_effect_claims
CREATE TABLE IF NOT EXISTS "fluxcore_external_effect_claims" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "account_id" uuid NOT NULL,
    "semantic_context_id" uuid NOT NULL,
    "work_id" uuid NOT NULL,
    "effect_type" varchar(100) NOT NULL,
    "status" varchar(20) NOT NULL,
    "claimed_at" timestamp DEFAULT now() NOT NULL,
    "released_at" timestamp,
    "external_effect_id" uuid
);

-- Indices
CREATE INDEX IF NOT EXISTS "fluxcore_works_acc_rel_conv_state_idx" ON "fluxcore_works" ("account_id", "relationship_id", "conversation_id", "state");
CREATE INDEX IF NOT EXISTS "fluxcore_works_acc_aggregate_key_idx" ON "fluxcore_works" ("account_id", "aggregate_key");
CREATE INDEX IF NOT EXISTS "fluxcore_work_events_work_created_idx" ON "fluxcore_work_events" ("work_id", "created_at");
CREATE INDEX IF NOT EXISTS "fluxcore_semantic_contexts_acc_conv_status_idx" ON "fluxcore_semantic_contexts" ("account_id", "conversation_id", "status");

-- FKs

ALTER TABLE "fluxcore_work_definitions" ADD CONSTRAINT "fluxcore_work_definitions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION;

ALTER TABLE "fluxcore_works" ADD CONSTRAINT "fluxcore_works_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_works" ADD CONSTRAINT "fluxcore_works_work_definition_id_fluxcore_work_definitions_id_fk" FOREIGN KEY ("work_definition_id") REFERENCES "fluxcore_work_definitions"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_works" ADD CONSTRAINT "fluxcore_works_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE NO ACTION;

ALTER TABLE "fluxcore_work_slots" ADD CONSTRAINT "fluxcore_work_slots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_work_slots" ADD CONSTRAINT "fluxcore_work_slots_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE NO ACTION;

ALTER TABLE "fluxcore_work_events" ADD CONSTRAINT "fluxcore_work_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_work_events" ADD CONSTRAINT "fluxcore_work_events_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE NO ACTION;

ALTER TABLE "fluxcore_semantic_contexts" ADD CONSTRAINT "fluxcore_semantic_contexts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_semantic_contexts" ADD CONSTRAINT "fluxcore_semantic_contexts_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE NO ACTION;

ALTER TABLE "fluxcore_external_effects" ADD CONSTRAINT "fluxcore_external_effects_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_external_effects" ADD CONSTRAINT "fluxcore_external_effects_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE NO ACTION;

ALTER TABLE "fluxcore_external_effect_claims" ADD CONSTRAINT "fluxcore_external_effect_claims_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_external_effect_claims" ADD CONSTRAINT "fluxcore_external_effect_claims_semantic_context_id_fluxcore_semantic_contexts_id_fk" FOREIGN KEY ("semantic_context_id") REFERENCES "fluxcore_semantic_contexts"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_external_effect_claims" ADD CONSTRAINT "fluxcore_external_effect_claims_work_id_fluxcore_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "fluxcore_works"("id") ON DELETE NO ACTION;
ALTER TABLE "fluxcore_external_effect_claims" ADD CONSTRAINT "fluxcore_external_effect_claims_external_effect_id_fluxcore_external_effects_id_fk" FOREIGN KEY ("external_effect_id") REFERENCES "fluxcore_external_effects"("id") ON DELETE NO ACTION;

-- Ajustes a tablas existentes
DO $$ BEGIN
 ALTER TABLE "fluxcore_proposed_works" ADD CONSTRAINT "fluxcore_proposed_works_work_definition_id_fluxcore_work_definitions_id_fk" FOREIGN KEY ("work_definition_id") REFERENCES "fluxcore_work_definitions"("id") ON DELETE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "fluxcore_decision_events" ALTER COLUMN "latency_ms" TYPE integer USING latency_ms::integer;
