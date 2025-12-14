import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { messages } from './messages';

export const mediaAttachments = pgTable(
  'media_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    url: text('url').notNull(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    durationSeconds: integer('duration_seconds'),
    thumbnailUrl: text('thumbnail_url'),
    waveformData: jsonb('waveform_data'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    messageIdx: index('idx_attachments_message').on(table.messageId),
    typeIdx: index('idx_attachments_type').on(table.type),
  })
);

export type MediaAttachment = typeof mediaAttachments.$inferSelect;
export type NewMediaAttachment = typeof mediaAttachments.$inferInsert;
