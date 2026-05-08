import { db } from '../connection';
import { sql } from 'drizzle-orm';

// Set test data on first account
await db.execute(sql`
  UPDATE accounts SET
    social_links = '{"instagram":"@meetgar_test","website":"meetgar.com"}'::jsonb,
    brand_colors = '{"primary":"#6366f1","secondary":"#8b5cf6","accent":"#ec4899"}'::jsonb
  WHERE id = (SELECT id FROM accounts LIMIT 1)
`);

// Verify
const r = await db.execute(sql`SELECT social_links, brand_colors, ai_include_social_links FROM accounts LIMIT 1`);
console.log('✅ Updated:', JSON.stringify(r[0], null, 2));
process.exit(0);
