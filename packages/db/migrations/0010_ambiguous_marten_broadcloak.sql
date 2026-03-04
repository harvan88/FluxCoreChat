CREATE TABLE IF NOT EXISTS "chatcore_outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"message_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" text NOT NULL,
	"attempts" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_owner_account_id_accounts_id_fk";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chatcore_outbox_pending" ON "chatcore_outbox" ("status","created_at");--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "owner_account_id";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "unread_count_a";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "unread_count_b";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "linked_account_id";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatcore_outbox" ADD CONSTRAINT "chatcore_outbox_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
