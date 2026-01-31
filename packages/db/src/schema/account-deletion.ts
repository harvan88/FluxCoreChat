import { pgTable, uuid, text, timestamp, varchar, jsonb, integer } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { users } from './users';

export const protectedAccounts = pgTable('protected_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason'),
  enforcedBy: text('enforced_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ProtectedAccount = typeof protectedAccounts.$inferSelect;

export const accountDeletionJobs = pgTable('account_deletion_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull(),
  requesterUserId: uuid('requester_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  requesterAccountId: uuid('requester_account_id')
    .references(() => accounts.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  phase: varchar('phase', { length: 50 }).notNull().default('snapshot'),
  snapshotUrl: text('snapshot_url'),
  snapshotReadyAt: timestamp('snapshot_ready_at', { withTimezone: true }),
  snapshotDownloadedAt: timestamp('snapshot_downloaded_at', { withTimezone: true }),
  snapshotDownloadCount: integer('snapshot_download_count').notNull().default(0),
  snapshotAcknowledgedAt: timestamp('snapshot_acknowledged_at', { withTimezone: true }),
  externalState: jsonb('external_state').$type<Record<string, unknown>>().default({}).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AccountDeletionJob = typeof accountDeletionJobs.$inferSelect;
export type NewAccountDeletionJob = typeof accountDeletionJobs.$inferInsert;

export const accountDeletionLogs = pgTable('account_deletion_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull(),
  accountId: uuid('account_id').notNull(),
  requesterUserId: uuid('requester_user_id').references(() => users.id, { onDelete: 'set null' }),
  requesterAccountId: uuid('requester_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull(),
  reason: text('reason'),
  details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AccountDeletionLog = typeof accountDeletionLogs.$inferSelect;
export type NewAccountDeletionLog = typeof accountDeletionLogs.$inferInsert;
