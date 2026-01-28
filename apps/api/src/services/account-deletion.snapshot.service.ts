import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { mkdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { db } from '@fluxcore/db';
import {
  accounts,
  relationships,
  conversations,
  messages,
  automationRules,
  fluxcoreAssistants,
  fluxcoreVectorStores,
} from '@fluxcore/db';
import { eq, or, inArray } from 'drizzle-orm';

interface SnapshotResult {
  url: string;
  path: string;
  sizeBytes: number;
  generatedAt: string;
}

class AccountDeletionSnapshotService {
  private baseDir = path.join(process.cwd(), 'uploads', 'account-snapshots');

  async generate(accountId: string, jobId: string): Promise<SnapshotResult> {
    const account = await this.getAccount(accountId);

    const [relationshipsData, automationData, assistants, vectorStores] = await Promise.all([
      this.getRelationships(accountId),
      this.getAutomationRules(accountId),
      this.getAssistants(accountId),
      this.getVectorStores(accountId),
    ]);

    const conversationsData = await this.getConversations(relationshipsData.map((rel) => rel.id));
    const messagesData = await this.getMessages(conversationsData.map((c) => c.id));

    const snapshotDir = path.join(this.baseDir, accountId);
    await mkdir(snapshotDir, { recursive: true });

    const snapshotPath = path.join(snapshotDir, `${jobId}.zip`);

    try {
      await unlink(snapshotPath);
    } catch {
      // ignore if file does not exist
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = createWriteStream(snapshotPath);
    const finalized = new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', (err) => reject(err));
      archive.on('error', (err) => reject(err));
    });

    archive.pipe(output);

    const summary = {
      generatedAt: new Date().toISOString(),
      accountId,
      jobId,
      totals: {
        relationships: relationshipsData.length,
        conversations: conversationsData.length,
        messages: messagesData.length,
        automationRules: automationData.length,
        assistants: assistants.length,
        vectorStores: vectorStores.length,
      },
    };

    archive.append(JSON.stringify(summary, null, 2), { name: 'SUMMARY.json' });
    archive.append(JSON.stringify(account, null, 2), { name: 'account.json' });
    archive.append(JSON.stringify(relationshipsData, null, 2), { name: 'relationships.json' });
    archive.append(JSON.stringify(conversationsData, null, 2), { name: 'conversations.json' });
    archive.append(JSON.stringify(messagesData, null, 2), { name: 'messages.json' });
    archive.append(JSON.stringify(automationData, null, 2), { name: 'automation-rules.json' });
    archive.append(JSON.stringify(assistants, null, 2), { name: 'assistants.json' });
    archive.append(JSON.stringify(vectorStores, null, 2), { name: 'vector-stores.json' });

    archive.append(
      `Snapshot export for account ${accountId}.\nIncluye datos de conversaciones, mensajes, configuraciones y automatizaciones activas.\n`,
      { name: 'README.txt' }
    );

    await archive.finalize();
    await finalized;

    const snapshotStat = await stat(snapshotPath);

    return {
      url: `/uploads/account-snapshots/${accountId}/${jobId}.zip`,
      path: snapshotPath,
      sizeBytes: snapshotStat.size,
      generatedAt: summary.generatedAt,
    };
  }

  private async getAccount(accountId: string) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
    if (!account) {
      throw new Error('Account not found for snapshot generation');
    }
    return account;
  }

  private async getRelationships(accountId: string) {
    return db
      .select()
      .from(relationships)
      .where(or(eq(relationships.accountAId, accountId), eq(relationships.accountBId, accountId)));
  }

  private async getConversations(relationshipIds: string[]) {
    if (relationshipIds.length === 0) {
      return [] as Awaited<ReturnType<typeof this.getConversations>>;
    }

    return db.select().from(conversations).where(inArray(conversations.relationshipId, relationshipIds));
  }

  private async getMessages(conversationIds: string[]) {
    if (conversationIds.length === 0) {
      return [] as Awaited<ReturnType<typeof this.getMessages>>;
    }

    return db.select().from(messages).where(inArray(messages.conversationId, conversationIds));
  }

  private async getAutomationRules(accountId: string) {
    return db.select().from(automationRules).where(eq(automationRules.accountId, accountId));
  }

  private async getAssistants(accountId: string) {
    return db.select().from(fluxcoreAssistants).where(eq(fluxcoreAssistants.accountId, accountId));
  }

  private async getVectorStores(accountId: string) {
    return db.select().from(fluxcoreVectorStores).where(eq(fluxcoreVectorStores.accountId, accountId));
  }
}

export const accountDeletionSnapshotService = new AccountDeletionSnapshotService();
