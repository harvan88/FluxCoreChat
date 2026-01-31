import {
  accountAiEntitlements,
  accounts,
  actors,
  appointmentServices,
  appointmentStaff,
  appointments,
  automationRules,
  conversations,
  creditsConversationSessions,
  creditsLedger,
  creditsWallets,
  db,
  extensionContexts,
  extensionInstallations,
  fluxcoreAccountCredits,
  fluxcoreAssetPermissions,
  fluxcoreAssistants,
  fluxcoreCreditTransactions,
  fluxcoreDocumentChunks,
  fluxcoreFiles,
  fluxcoreInstructions,
  fluxcoreMarketplaceListings,
  fluxcoreMarketplaceReviews,
  fluxcoreMarketplaceSubscriptions,
  fluxcoreRagConfigurations,
  fluxcoreToolConnections,
  fluxcoreUsageLogs,
  fluxcoreVectorStoreFiles,
  fluxcoreVectorStores,
  messages,
  protectedAccounts,
  relationships,
  systemAdmins,
  websiteConfigs,
  workspaces,
  // Asset Management (Chat Core)
  assets,
  assetUploadSessions,
  assetPolicies,
  assetAuditLogs,
  messageAssets,
  templateAssets,
  planAssets,
} from '@fluxcore/db';
import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm';

type DbClient = typeof db;

export interface AccountPurgeSummary {
  accountId: string;
  deleted: Record<string, number>;
}

interface AccountPurgeServiceDeps {
  db: DbClient;
}

export class AccountPurgeService {
  constructor(private readonly deps: AccountPurgeServiceDeps = { db }) {}

  async purgeAccountData(accountId: string, tx?: DbClient): Promise<AccountPurgeSummary> {
    return this.withTransaction(tx, (trx) => this.executePurge(accountId, trx));
  }

  private async withTransaction<T>(client: DbClient | undefined, handler: (trx: DbClient) => Promise<T>) {
    if (client) {
      return handler(client);
    }

    return this.deps.db.transaction(async (trx) => handler(trx));
  }

  private async executePurge(accountId: string, tx: DbClient): Promise<AccountPurgeSummary> {
    const summary: AccountPurgeSummary = { accountId, deleted: {} };
    const recordDeletion = (label: string, count: number) => {
      if (count <= 0) return;
      summary.deleted[label] = (summary.deleted[label] ?? 0) + count;
    };
    const deleteAndCount = async <T>(label: string, executor: () => Promise<T[]>) => {
      const rows = await executor();
      recordDeletion(label, rows.length);
    };

    const [account] = await tx
      .select({ id: accounts.id, ownerUserId: accounts.ownerUserId })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Extensions / automation / surface config
    await deleteAndCount('automationRules', () =>
      tx.delete(automationRules).where(eq(automationRules.accountId, accountId)).returning({ id: automationRules.id }),
    );
    await deleteAndCount('extensionContexts', () =>
      tx.delete(extensionContexts).where(eq(extensionContexts.accountId, accountId)).returning({ id: extensionContexts.id }),
    );
    await deleteAndCount('extensionInstallations', () =>
      tx.delete(extensionInstallations).where(eq(extensionInstallations.accountId, accountId)).returning({ id: extensionInstallations.id }),
    );
    await deleteAndCount('websiteConfigs', () =>
      tx.delete(websiteConfigs).where(eq(websiteConfigs.accountId, accountId)).returning({ id: websiteConfigs.id }),
    );
    await deleteAndCount('workspaces', () =>
      tx.delete(workspaces).where(eq(workspaces.ownerAccountId, accountId)).returning({ id: workspaces.id }),
    );
    await deleteAndCount('accountAiEntitlements', () =>
      tx.delete(accountAiEntitlements).where(eq(accountAiEntitlements.accountId, accountId)).returning({ id: accountAiEntitlements.id }),
    );

    // Appointments
    await deleteAndCount('appointmentServices', () =>
      tx.delete(appointmentServices).where(eq(appointmentServices.accountId, accountId)).returning({ id: appointmentServices.id }),
    );
    await deleteAndCount('appointmentStaff', () =>
      tx.delete(appointmentStaff).where(eq(appointmentStaff.accountId, accountId)).returning({ id: appointmentStaff.id }),
    );
    await deleteAndCount('appointments', () =>
      tx
        .delete(appointments)
        .where(or(eq(appointments.accountId, accountId), eq(appointments.clientAccountId, accountId)))
        .returning({ id: appointments.id }),
    );

    // FluxCore configurations / assistants / files
    await deleteAndCount('fluxcoreToolConnections', () =>
      tx.delete(fluxcoreToolConnections).where(eq(fluxcoreToolConnections.accountId, accountId)).returning({ id: fluxcoreToolConnections.id }),
    );
    await deleteAndCount('fluxcoreInstructions', () =>
      tx.delete(fluxcoreInstructions).where(eq(fluxcoreInstructions.accountId, accountId)).returning({ id: fluxcoreInstructions.id }),
    );
    await deleteAndCount('fluxcoreAssistants', () =>
      tx.delete(fluxcoreAssistants).where(eq(fluxcoreAssistants.accountId, accountId)).returning({ id: fluxcoreAssistants.id }),
    );

    const vectorStoreIds = (
      await tx
        .select({ id: fluxcoreVectorStores.id })
        .from(fluxcoreVectorStores)
        .where(eq(fluxcoreVectorStores.accountId, accountId))
    ).map((row) => row.id);

    if (vectorStoreIds.length > 0) {
      await deleteAndCount('fluxcoreVectorStoreFiles', () =>
        tx
          .delete(fluxcoreVectorStoreFiles)
          .where(inArray(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreIds))
          .returning({ id: fluxcoreVectorStoreFiles.id }),
      );
      await deleteAndCount('fluxcoreRagConfigurations.vectorStore', () =>
        tx
          .delete(fluxcoreRagConfigurations)
          .where(inArray(fluxcoreRagConfigurations.vectorStoreId, vectorStoreIds))
          .returning({ id: fluxcoreRagConfigurations.id }),
      );
    }

    await deleteAndCount('fluxcoreDocumentChunks', () =>
      tx.delete(fluxcoreDocumentChunks).where(eq(fluxcoreDocumentChunks.accountId, accountId)).returning({ id: fluxcoreDocumentChunks.id }),
    );
    await deleteAndCount('fluxcoreFiles', () =>
      tx.delete(fluxcoreFiles).where(eq(fluxcoreFiles.accountId, accountId)).returning({ id: fluxcoreFiles.id }),
    );
    await deleteAndCount('fluxcoreRagConfigurations.account', () =>
      tx
        .delete(fluxcoreRagConfigurations)
        .where(and(eq(fluxcoreRagConfigurations.accountId, accountId), isNull(fluxcoreRagConfigurations.vectorStoreId)))
        .returning({ id: fluxcoreRagConfigurations.id }),
    );
    await deleteAndCount('fluxcoreVectorStores', () =>
      tx.delete(fluxcoreVectorStores).where(eq(fluxcoreVectorStores.accountId, accountId)).returning({ id: fluxcoreVectorStores.id }),
    );

    // Usage / credits / marketplace
    await deleteAndCount('fluxcoreUsageLogs', () =>
      tx.delete(fluxcoreUsageLogs).where(eq(fluxcoreUsageLogs.accountId, accountId)).returning({ id: fluxcoreUsageLogs.id }),
    );
    await deleteAndCount('fluxcoreAccountCredits', () =>
      tx.delete(fluxcoreAccountCredits).where(eq(fluxcoreAccountCredits.accountId, accountId)).returning({ id: fluxcoreAccountCredits.id }),
    );
    await deleteAndCount('fluxcoreCreditTransactions', () =>
      tx
        .delete(fluxcoreCreditTransactions)
        .where(eq(fluxcoreCreditTransactions.accountId, accountId))
        .returning({ id: fluxcoreCreditTransactions.id }),
    );
    await deleteAndCount('fluxcoreAssetPermissions', () =>
      tx
        .delete(fluxcoreAssetPermissions)
        .where(
          or(
            eq(fluxcoreAssetPermissions.granteeAccountId, accountId),
            eq(fluxcoreAssetPermissions.grantedByAccountId, accountId),
          ),
        )
        .returning({ id: fluxcoreAssetPermissions.id }),
    );
    await deleteAndCount('fluxcoreMarketplaceListings', () =>
      tx
        .delete(fluxcoreMarketplaceListings)
        .where(eq(fluxcoreMarketplaceListings.sellerAccountId, accountId))
        .returning({ id: fluxcoreMarketplaceListings.id }),
    );
    await deleteAndCount('fluxcoreMarketplaceSubscriptions', () =>
      tx
        .delete(fluxcoreMarketplaceSubscriptions)
        .where(eq(fluxcoreMarketplaceSubscriptions.subscriberAccountId, accountId))
        .returning({ id: fluxcoreMarketplaceSubscriptions.id }),
    );
    await deleteAndCount('fluxcoreMarketplaceReviews', () =>
      tx
        .delete(fluxcoreMarketplaceReviews)
        .where(eq(fluxcoreMarketplaceReviews.reviewerAccountId, accountId))
        .returning({ id: fluxcoreMarketplaceReviews.id }),
    );

    await deleteAndCount('creditsLedger', () =>
      tx.delete(creditsLedger).where(eq(creditsLedger.accountId, accountId)).returning({ id: creditsLedger.id }),
    );
    await deleteAndCount('creditsWallets', () =>
      tx.delete(creditsWallets).where(eq(creditsWallets.accountId, accountId)).returning({ id: creditsWallets.id }),
    );
    await deleteAndCount('creditsConversationSessions', () =>
      tx
        .delete(creditsConversationSessions)
        .where(eq(creditsConversationSessions.accountId, accountId))
        .returning({ id: creditsConversationSessions.id }),
    );

    // Asset Management (Chat Core) - delete relations first, then assets
    const accountAssetIds = (
      await tx
        .select({ id: assets.id })
        .from(assets)
        .where(eq(assets.accountId, accountId))
    ).map((row) => row.id);

    if (accountAssetIds.length > 0) {
      await deleteAndCount('messageAssets', () =>
        tx.delete(messageAssets).where(inArray(messageAssets.assetId, accountAssetIds)).returning({ assetId: messageAssets.assetId }),
      );
      await deleteAndCount('templateAssets', () =>
        tx.delete(templateAssets).where(inArray(templateAssets.assetId, accountAssetIds)).returning({ assetId: templateAssets.assetId }),
      );
      await deleteAndCount('planAssets', () =>
        tx.delete(planAssets).where(inArray(planAssets.assetId, accountAssetIds)).returning({ assetId: planAssets.assetId }),
      );
    }

    await deleteAndCount('assetAuditLogs', () =>
      tx.delete(assetAuditLogs).where(eq(assetAuditLogs.accountId, accountId)).returning({ id: assetAuditLogs.id }),
    );
    await deleteAndCount('assetPolicies', () =>
      tx.delete(assetPolicies).where(eq(assetPolicies.accountId, accountId)).returning({ id: assetPolicies.id }),
    );
    await deleteAndCount('assetUploadSessions', () =>
      tx.delete(assetUploadSessions).where(eq(assetUploadSessions.accountId, accountId)).returning({ id: assetUploadSessions.id }),
    );
    await deleteAndCount('assets', () =>
      tx.delete(assets).where(eq(assets.accountId, accountId)).returning({ id: assets.id }),
    );

    // Conversations / relationships
    const relationshipIds = (
      await tx
        .select({ id: relationships.id })
        .from(relationships)
        .where(or(eq(relationships.accountAId, accountId), eq(relationships.accountBId, accountId)))
    ).map((row) => row.id);

    if (relationshipIds.length > 0) {
      const conversationIds = (
        await tx
          .select({ id: conversations.id })
          .from(conversations)
          .where(inArray(conversations.relationshipId, relationshipIds))
      ).map((row) => row.id);

      if (conversationIds.length > 0) {
        await deleteAndCount('messages.byConversation', () =>
          tx.delete(messages).where(inArray(messages.conversationId, conversationIds)).returning({ id: messages.id }),
        );
        await deleteAndCount('conversations', () =>
          tx.delete(conversations).where(inArray(conversations.id, conversationIds)).returning({ id: conversations.id }),
        );
      }

      await deleteAndCount('relationships', () =>
        tx.delete(relationships).where(inArray(relationships.id, relationshipIds)).returning({ id: relationships.id }),
      );
    }

    await deleteAndCount('messages.bySender', () =>
      tx.delete(messages).where(eq(messages.senderAccountId, accountId)).returning({ id: messages.id }),
    );

    await deleteAndCount('protectedAccounts', () =>
      tx.delete(protectedAccounts).where(eq(protectedAccounts.accountId, accountId)).returning({ id: protectedAccounts.id }),
    );

    const [otherAccountOwned] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.ownerUserId, account.ownerUserId), ne(accounts.id, accountId)))
      .limit(1);

    if (!otherAccountOwned) {
      await deleteAndCount('systemAdmins', () =>
        tx.delete(systemAdmins).where(eq(systemAdmins.userId, account.ownerUserId)).returning({ userId: systemAdmins.userId }),
      );
    }

    await deleteAndCount('actors', () => tx.delete(actors).where(eq(actors.accountId, accountId)).returning({ id: actors.id }));
    await deleteAndCount('accounts', () => tx.delete(accounts).where(eq(accounts.id, accountId)).returning({ id: accounts.id }));

    return summary;
  }
}

export const accountPurgeService = new AccountPurgeService();
