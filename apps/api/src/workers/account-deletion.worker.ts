import { db } from '@fluxcore/db';
import {
  accountDeletionJobs,
  accountDeletionLogs,
  automationRules,
  fluxcoreAssistants,
  fluxcoreVectorStores,
  conversations,
  messages,
  relationships,
  accounts,
  actors,
} from '@fluxcore/db';
import { eq, inArray, and } from 'drizzle-orm';
import { fluxcoreService } from '../services/fluxcore.service';
import { deleteVectorStoreCascade } from '../services/vector-store-deletion.service';
import { broadcastSystemEvent } from '../websocket/system-events';
import { ensureAccountDeletionAllowed } from '../services/account-deletion.guard';

type DeletionJobStatus = 'external_cleanup' | 'local_cleanup' | 'completed' | 'failed';

type DeletionJob = typeof accountDeletionJobs.$inferSelect;

class AccountDeletionWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 5000;
  private ticking = false;

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      if (this.ticking) return;
      this.ticking = true;
      this.tick()
        .catch((error) => {
          console.error('[AccountDeletionWorker] tick error', error);
        })
        .finally(() => {
          this.ticking = false;
        });
    }, this.intervalMs);

    console.log('🧹 AccountDeletionWorker started');
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    const job = await this.getNextJob();
    if (!job) {
      return;
    }

    try {
      if (job.status === 'external_cleanup') {
        await this.ensureJobAllowed(job);
        await this.processExternalCleanup(job);
      } else if (job.status === 'local_cleanup') {
        await this.ensureJobAllowed(job);
        await this.processLocalCleanup(job);
      }
    } catch (error) {
      console.error('[AccountDeletionWorker] job failed', job.id, error);
      await this.markFailed(job, (error as Error)?.message ?? 'Unknown error');
    }
  }

  private ensureJobAllowed(job: DeletionJob) {
    return ensureAccountDeletionAllowed(job.accountId, {
      requesterUserId: job.requesterUserId,
      requesterAccountId: job.requesterAccountId ?? undefined,
      details: {
        phase: job.status,
        jobId: job.id,
      },
    });
  }

  private async getNextJob(): Promise<DeletionJob | null> {
    const [job] = await db
      .select()
      .from(accountDeletionJobs)
      .where(inArray(accountDeletionJobs.status as any, ['external_cleanup', 'local_cleanup']))
      .limit(1);

    return job ?? null;
  }

  private async processExternalCleanup(job: DeletionJob) {
    const startedAt = job.metadata?.externalCleanupStartedAt ?? new Date().toISOString();

    const externalState = { ...(job.externalState || {}) };

    // Eliminar asistentes (incluye OpenAI si aplica)
    const assistants = await db
      .select({ id: fluxcoreAssistants.id })
      .from(fluxcoreAssistants)
      .where(eq(fluxcoreAssistants.accountId, job.accountId));

    for (const assistant of assistants) {
      try {
        await fluxcoreService.deleteAssistant(assistant.id, job.accountId);
      } catch (error) {
        console.error('[AccountDeletionWorker] Failed to delete assistant', assistant.id, error);
        throw error;
      }
    }

    externalState.assistantsRemoved = true;

    // Eliminar vector stores en cascada (incluye OpenAI)
    const vectorStores = await db
      .select({ id: fluxcoreVectorStores.id })
      .from(fluxcoreVectorStores)
      .where(eq(fluxcoreVectorStores.accountId, job.accountId));

    for (const store of vectorStores) {
      try {
        await deleteVectorStoreCascade(store.id, job.accountId);
      } catch (error) {
        console.error('[AccountDeletionWorker] Failed to delete vector store', store.id, error);
        throw error;
      }
    }

    externalState.vectorStoresRemoved = true;

    const metadata = {
      ...(job.metadata || {}),
      externalCleanupStartedAt: startedAt,
      externalCleanupFinishedAt: new Date().toISOString(),
    };

    const [updated] = await db
      .update(accountDeletionJobs)
      .set({
        status: 'local_cleanup',
        phase: 'local_cleanup',
        metadata,
        externalState,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, job.id))
      .returning();

    await this.log(job.accountId, job.id, 'local_cleanup', 'External cleanup completed');
    console.log('[AccountDeletionWorker] External cleanup done for job', job.id, '→ local_cleanup');

    return updated;
  }

  private async processLocalCleanup(job: DeletionJob) {
    const startedAt = job.metadata?.localCleanupStartedAt ?? new Date().toISOString();

    await db.transaction(async (tx) => {
      // Automation rules
      await tx.delete(automationRules).where(eq(automationRules.accountId, job.accountId));

      // Mensajes y conversaciones
      const conversationIds = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .innerJoin(relationships, eq(conversations.relationshipId, relationships.id))
        .where(and(eq(relationships.accountAId, job.accountId)));

      const convoIdList = conversationIds.map((c) => c.id);
      if (convoIdList.length > 0) {
        await tx.delete(messages).where(inArray(messages.conversationId, convoIdList));
        await tx.delete(conversations).where(inArray(conversations.id, convoIdList));
      }

      // Relationships
      await tx.delete(relationships).where(eq(relationships.accountAId, job.accountId));
      await tx.delete(relationships).where(eq(relationships.accountBId, job.accountId));

      // Fluxcore tables (ya vacías tras external cleanup)
      await tx.delete(fluxcoreAssistants).where(eq(fluxcoreAssistants.accountId, job.accountId));
      await tx.delete(fluxcoreVectorStores).where(eq(fluxcoreVectorStores.accountId, job.accountId));

      // Cuenta y actores
      await tx.delete(actors).where(eq(actors.accountId, job.accountId));
      await tx.delete(accounts).where(eq(accounts.id, job.accountId));
    });

    const metadata = {
      ...(job.metadata || {}),
      localCleanupStartedAt: startedAt,
      localCleanupFinishedAt: new Date().toISOString(),
    };

    await db
      .update(accountDeletionJobs)
      .set({
        status: 'completed',
        phase: 'completed',
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, job.id));

    await this.log(job.accountId, job.id, 'completed', 'Local cleanup completed');
    console.log('[AccountDeletionWorker] Job completed', job.id);

    broadcastSystemEvent({
      type: 'account:deleted',
      accountId: job.accountId,
      jobId: job.id,
    });
  }

  private async markFailed(job: DeletionJob, reason: string) {
    await db
      .update(accountDeletionJobs)
      .set({
        status: 'failed',
        phase: 'failed',
        failureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, job.id));

    await this.log(job.accountId, job.id, 'failed', reason);

    broadcastSystemEvent({
      type: 'account:deletion_failed',
      accountId: job.accountId,
      jobId: job.id,
      reason,
    });
  }

  private async log(accountId: string, jobId: string, status: DeletionJobStatus, reason: string) {
    await db.insert(accountDeletionLogs).values({
      accountId,
      jobId,
      status,
      reason,
      details: {},
      createdAt: new Date(),
    });
  }
}

export const accountDeletionWorker = new AccountDeletionWorker();
