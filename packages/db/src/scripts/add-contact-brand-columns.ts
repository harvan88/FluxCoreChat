#!/usr/bin/env bun
/**
 * Migration: Add socialLinks, brandColors, and aiIncludeSocialLinks columns to accounts
 * Part of the Account & Brand feature (Fase 1)
 */

import { db } from '../connection';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Adding Contact & Brand columns to accounts...');

  // Add aiIncludeSocialLinks boolean
  await db.execute(sql`
    ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS ai_include_social_links BOOLEAN NOT NULL DEFAULT true
  `);
  console.log('  ✅ ai_include_social_links');

  // Add socialLinks JSONB
  await db.execute(sql`
    ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb
  `);
  console.log('  ✅ social_links');

  // Add brandColors JSONB
  await db.execute(sql`
    ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS brand_colors JSONB NOT NULL DEFAULT '{}'::jsonb
  `);
  console.log('  ✅ brand_colors');

  console.log('✨ Migration complete');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
