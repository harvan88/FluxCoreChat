CREATE TABLE IF NOT EXISTS "fluxcore_decision_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"trace_id" varchar(255) NOT NULL,
	"message_id" uuid,
	"input" jsonb NOT NULL,
	"proposed_work" jsonb,
	"model_info" jsonb,
	"latency_ms" real,
	"tokens" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
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
DO $$ BEGIN
 ALTER TABLE "fluxcore_decision_events" ADD CONSTRAINT "fluxcore_decision_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
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
