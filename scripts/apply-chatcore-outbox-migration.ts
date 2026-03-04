#!/usr/bin/env bun

/**
 * Aplicar migración de ChatCore Outbox
 * Ejecutar: bun scripts/apply-chatcore-outbox-migration.ts
 */

import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function applyMigration() {
  console.log('🔄 Aplicando migración ChatCore Outbox...');
  
  try {
    // Verificar si la tabla ya existe
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chatcore_outbox'
      );
    `);

    if (tableExists[0]?.exists) {
      console.log('✅ Tabla chatcore_outbox ya existe');
      return;
    }

    // Aplicar migración SQL
    await db.execute(sql`
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
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chatcore_outbox_pending" ON "chatcore_outbox" ("status","created_at");
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "chatcore_outbox" ADD CONSTRAINT "chatcore_outbox_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Migración ChatCore Outbox aplicada exitosamente');
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

applyMigration();
