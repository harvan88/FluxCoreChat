import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { assets } from './assets';

export const assetEnrichments = pgTable('asset_enrichments', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assetTypeUnique: uniqueIndex('ux_asset_enrichments_type').on(table.assetId, table.type),
  assetIdx: index('idx_asset_enrichments_asset').on(table.assetId),
}));

export type AssetEnrichment = typeof assetEnrichments.$inferSelect;
export type NewAssetEnrichment = typeof assetEnrichments.$inferInsert;
