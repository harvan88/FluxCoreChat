import { db, accountDeletionJobs, accountDeletionLogs, accounts } from '@fluxcore/db';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { DeletionJobStatus } from '../workers/account-deletion.processor';
import { featureFlags } from '../config/feature-flags';
import { enqueueAccountDeletionJob, getAccountDeletionQueueStats } from '../workers/account-deletion.queue';

type JobStatus = typeof accountDeletionJobs.$inferSelect.status;
type Phase = typeof accountDeletionJobs.$inferSelect.phase;

const RETRIABLE_PHASES: Phase[] = ['external_cleanup', 'local_cleanup'];

interface ListJobsOptions {
  limit?: number;
  statuses?: JobStatus[];
}

interface ListLogsOptions {
  limit?: number;
  accountId?: string;
  jobId?: string;
  status?: DeletionJobStatus;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface AccountDataReference {
  tableName: string;
  columnName: string;
  rowCount: number;
}

export interface AccountOrphanReference {
  tableName: string;
  columnName: string;
  orphanCount: number;
  sampleIds: string[];
}

class AccountDeletionAdminService {
  async listJobs(options: ListJobsOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const statuses = options.statuses?.length ? options.statuses : undefined;

    const rows = await db
      .select({
        job: accountDeletionJobs,
        accountDisplayName: accounts.displayName,
        accountUsername: accounts.username,
      })
      .from(accountDeletionJobs)
      .leftJoin(accounts, eq(accountDeletionJobs.accountId, accounts.id))
      .where(statuses ? inArray(accountDeletionJobs.status as any, statuses as any) : undefined)
      .orderBy(desc(accountDeletionJobs.createdAt))
      .limit(limit);

    return rows.map(({ job, accountDisplayName, accountUsername }) => ({
      ...job,
      accountDisplayName,
      accountUsername,
    }));
  }

  async retryJobPhase(jobId: string, phase: Phase) {
    if (!RETRIABLE_PHASES.includes(phase)) {
      throw new Error('Unsupported phase for retry');
    }

    const [existing] = await db
      .select()
      .from(accountDeletionJobs)
      .where(eq(accountDeletionJobs.id, jobId))
      .limit(1);

    if (!existing) {
      throw new Error('Deletion job not found');
    }

    await db
      .update(accountDeletionJobs)
      .set({
        status: phase as JobStatus,
        phase,
        failureReason: null,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, jobId));

    if (featureFlags.accountDeletionQueue) {
      await enqueueAccountDeletionJob(jobId);
    }

    return { jobId, phase };
  }

  async getStats() {
    const rows = await db
      .select({
        status: accountDeletionJobs.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(accountDeletionJobs)
      .groupBy(accountDeletionJobs.status);

    const queueStats = featureFlags.accountDeletionQueue ? await getAccountDeletionQueueStats() : null;

    return {
      jobs: rows,
      queue: queueStats,
    };
  }

  async listLogs(options: ListLogsOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);

    const whereClauses = [] as ReturnType<typeof and>[];

    if (options.accountId) {
      whereClauses.push(eq(accountDeletionLogs.accountId, options.accountId));
    }

    if (options.jobId) {
      whereClauses.push(eq(accountDeletionLogs.jobId, options.jobId));
    }

    if (options.status) {
      whereClauses.push(eq(accountDeletionLogs.status as any, options.status as any));
    }

    if (options.createdAfter) {
      whereClauses.push(gte(accountDeletionLogs.createdAt, options.createdAfter));
    }

    if (options.createdBefore) {
      whereClauses.push(lte(accountDeletionLogs.createdAt, options.createdBefore));
    }

    const rows = await db
      .select()
      .from(accountDeletionLogs)
      .where(whereClauses.length ? and(...whereClauses) : undefined)
      .orderBy(desc(accountDeletionLogs.createdAt))
      .limit(limit);

    return rows;
  }

  async findAccountReferences(accountId: string): Promise<AccountDataReference[]> {
    if (!accountId) {
      throw new Error('accountId requerido');
    }

    const rows = (await db.execute(sql`
      SELECT table_name, column_name, row_count::bigint AS row_count
      FROM monitoring.check_account_references(${accountId}::uuid)
    `)) as Array<{ table_name: string; column_name: string; row_count: bigint | number }>;

    return rows
      .map((row) => ({
        tableName: row.table_name,
        columnName: row.column_name,
        rowCount: Number(row.row_count) || 0,
      }))
      .sort((a, b) => b.rowCount - a.rowCount);
  }

  async listAccountReferenceOrphans(sampleLimit = 5): Promise<AccountOrphanReference[]> {
    const rows = (await db.execute(sql`
      SELECT table_name, column_name, orphan_count::bigint AS orphan_count, sample_ids
      FROM monitoring.list_account_reference_orphans(${sampleLimit})
    `)) as Array<{ table_name: string; column_name: string; orphan_count: bigint | number; sample_ids: string[] | null }>;

    return rows.map((row) => ({
      tableName: row.table_name,
      columnName: row.column_name,
      orphanCount: Number(row.orphan_count) || 0,
      sampleIds: Array.isArray(row.sample_ids) ? row.sample_ids : [],
    }));
  }
}

export const accountDeletionAdminService = new AccountDeletionAdminService();
