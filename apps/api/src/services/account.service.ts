import { db } from '@fluxcore/db';
import { accounts, actors, users } from '@fluxcore/db';
import { eq, and, or, ne, ilike } from 'drizzle-orm';
import { validatePrivateContext, validateDisplayName } from '../utils/context-limits';
import { coreEventBus } from '../core/events';
import type { Account } from '@fluxcore/db';
import { extensionService } from './extension.service';
import { manifestLoader } from './manifest-loader.service';
import { systemTemplateProvisioner } from './system-template-provisioner.service';

// V2-4.2: Instalación de extensiones preinstaladas en nuevas cuentas

export class AccountService {
  async createAccount(data: {
    ownerUserId: string;
    alias: string;
    username?: string;
    displayName: string;
    accountType: 'personal' | 'business';
    profile?: any;
    privateContext?: string;
    allowAutomatedUse?: boolean;
    aiIncludeName?: boolean;
    aiIncludeBio?: boolean;
    aiIncludePrivateContext?: boolean;
    aiIncludeTimestamp?: boolean;
  }) {
    const aliasValue = data.alias;

    // Check if alias is taken
    const existing = await db
      .select()
      .from(accounts)
      .where(eq(accounts.alias, aliasValue))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Alias already taken');
    }

    // COR-006: Validación centralizada de límites
    const displayNameValidation = validateDisplayName(data.displayName);
    if (!displayNameValidation.valid) {
      throw new Error(displayNameValidation.error);
    }

    const privateContextValidation = validatePrivateContext(data.privateContext);
    if (!privateContextValidation.valid) {
      throw new Error(privateContextValidation.error);
    }

    // Create account — write both username and alias for backward compat
    const [account] = await db
      .insert(accounts)
      .values({
        ownerUserId: data.ownerUserId,
        username: data.username || aliasValue,
        alias: aliasValue,
        displayName: data.displayName,
        accountType: data.accountType,
        profile: data.profile || {},
        privateContext: data.privateContext || null,
        allowAutomatedUse: data.allowAutomatedUse ?? false,
        aiIncludeName: data.aiIncludeName ?? true,
        aiIncludeBio: data.aiIncludeBio ?? true,
        aiIncludePrivateContext: data.aiIncludePrivateContext ?? true,
        aiIncludeTimestamp: data.aiIncludeTimestamp ?? true,
      })
      .returning();

    // Create actor (owner relationship)
    await db.insert(actors).values({
      userId: data.ownerUserId,
      accountId: account.id,
      role: 'owner',
      actorType: 'account',
    });

    // FC-154-155: V2-4.2: Auto-install preinstalled extensions
    try {
      const preinstalled = manifestLoader.getPreinstalledManifests();
      for (const manifest of preinstalled) {
        // Install but keep DISABLED by default per user requirement
        // This allows the user to manually enable it from the UI (Extensions panel)
        // and immediately see it in the activity bar.
        await extensionService.install({
          accountId: account.id,
          extensionId: manifest.id,
          version: manifest.version,
          enabled: false, // Hidden from activity bar by default
          config: manifestLoader.getDefaultConfig(manifest.id),
          grantedPermissions: manifest.permissions,
          grantedBy: undefined, // Owner
        });
        console.log(`[AccountService] Auto-installed preinstalled extension ${manifest.id} (disabled) for account ${account.id}`);
      }
    } catch (err) {
      console.error('[AccountService] Failed to auto-install extensions:', err);
      // We don't fail account creation if extensions fail to install
    }





    return account;
  }

  async getAccountsByUserId(userId: string) {
    return await db.select().from(accounts).where(eq(accounts.ownerUserId, userId));
  }

  async getAccountById(accountId: string) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  async updateAccount(
    accountId: string,
    userId: string,
    data: {
      displayName?: string;
      profile?: any;
      privateContext?: string;
      allowAutomatedUse?: boolean;
      aiIncludeName?: boolean;
      aiIncludeBio?: boolean;
      aiIncludePrivateContext?: boolean;
      aiIncludeTimestamp?: boolean;
      aiIncludeSocialLinks?: boolean;
      aiIncludeLocations?: boolean;
      alias?: string | null;
      avatarAssetId?: string;
      socialLinks?: { instagram?: string; facebook?: string; whatsapp?: string; website?: string; tiktok?: string };
      brandColors?: { primary?: string; secondary?: string; accent?: string };
      country?: string | null;
      timezone?: string | null;
    }
  ) {
    // Verify ownership
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.ownerUserId, userId)))
      .limit(1);

    if (!account) {
      throw new Error('Account not found or unauthorized');
    }

    // COR-006: Validación centralizada de límites
    if (data.displayName) {
      const displayNameValidation = validateDisplayName(data.displayName);
      if (!displayNameValidation.valid) {
        throw new Error(displayNameValidation.error);
      }
    }

    if (data.privateContext) {
      const privateContextValidation = validatePrivateContext(data.privateContext);
      if (!privateContextValidation.valid) {
        throw new Error(privateContextValidation.error);
      }
    }

    // Alias validation
    if (data.alias !== undefined && data.alias !== null) {
      const raw = data.alias.trim().toLowerCase();
      const aliasRegex = /^[a-z][a-z0-9_-]{2,29}$/;
      if (!aliasRegex.test(raw)) {
        throw new Error('El alias debe tener 3-30 caracteres, empezar con letra y solo contener letras, números, guiones o guiones bajos.');
      }
      const reserved = ['admin', 'api', 'app', 'login', 'register', 'settings', 'help', 'support', 'meetgar', 'fluxcore', 'system', 'null', 'undefined', 'public', 'private'];
      if (reserved.includes(raw)) {
        throw new Error('Este alias está reservado.');
      }
      // Check uniqueness (exclude current account)
      const existing = await db.query.accounts.findFirst({
        where: and(eq(accounts.alias, raw), ne(accounts.id, accountId)),
        columns: { id: true },
      });
      if (existing) {
        throw new Error('Este alias ya está en uso.');
      }
      data.alias = raw;
    }

    // Validar avatarAssetId si está presente
    if (data.avatarAssetId !== undefined) {
      if (!data.avatarAssetId || data.avatarAssetId === '' || data.avatarAssetId === 'undefined') {
        // Si avatarAssetId es inválido, eliminarlo del objeto data
        delete data.avatarAssetId;
      }
    }

    const [updated] = await db
      .update(accounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();

    // 🛡️ SOBERANÍA: Sincronizar flags con fluxcore_account_policies
    // Esto asegura que la política (FluxCore) tenga la última palabra
    const visibilityFlags: any = {};
    if (data.aiIncludeName !== undefined) visibilityFlags.aiIncludeName = data.aiIncludeName;
    if (data.aiIncludeBio !== undefined) visibilityFlags.aiIncludeBio = data.aiIncludeBio;
    if (data.aiIncludeLocations !== undefined) visibilityFlags.aiIncludeLocations = data.aiIncludeLocations;
    if (data.aiIncludeSchedule !== undefined) visibilityFlags.aiIncludeSchedule = data.aiIncludeSchedule;
    if (data.aiIncludeSocialLinks !== undefined) visibilityFlags.aiIncludeSocialLinks = data.aiIncludeSocialLinks;
    if (data.aiIncludePrivateContext !== undefined) visibilityFlags.aiIncludePrivateContext = data.aiIncludePrivateContext;

    if (Object.keys(visibilityFlags).length > 0) {
      const { fluxcoreAccountPolicies } = await import('@fluxcore/db');
      await db.insert(fluxcoreAccountPolicies)
        .values({ accountId, ...visibilityFlags })
        .onConflictDoUpdate({
          target: [fluxcoreAccountPolicies.accountId],
          set: { ...visibilityFlags, updatedAt: new Date() }
        });
      console.log(`[AccountService] 🛡️ AI Sovereignty flags synced for account ${accountId}`);
    }

    // FC-823: If displayName changed, update location names to keep consistency
    if (data.displayName && account.displayName !== data.displayName) {
      const { accountLocations } = await import('@fluxcore/db');
      const locations = await db.select()
        .from(accountLocations)
        .where(eq(accountLocations.accountId, accountId))
        .orderBy(accountLocations.createdAt);

      for (let i = 0; i < locations.length; i++) {
        const letter = String.fromCharCode(65 + i);
        const newName = `${updated.displayName} - Sede ${letter}`;
        await db.update(accountLocations)
          .set({ name: newName })
          .where(eq(accountLocations.id, locations[i].id));
      }
    }

    // PC-823: Sincronizar plantilla de horarios con el estado del perfil
    if (data.aiIncludeLocations !== undefined) {
      await systemTemplateProvisioner.syncScheduleTemplate(accountId, data.aiIncludeLocations);
    }

    // PC-823: Emit domain event for PolicyContext invalidation
    coreEventBus.emit('account.profile.updated', {
      accountId,
      allowAutomatedUse: updated.allowAutomatedUse,
    });

    return updated;
  }

  /**
   * Search accounts by alias or owner email
   * @param query - Search query (can be @alias, email, or partial match)
   */
  async searchAccounts(query: string) {
    // Remove @ prefix if present
    const searchTerm = query.startsWith('@') ? query.slice(1) : query;
    const pattern = `%${searchTerm}%`;

    // Search in accounts by alias or displayName
    const accountResults = await db
      .select({
        id: accounts.id,
        alias: accounts.alias,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(accounts)
      .where(
        or(
          ilike(accounts.alias, pattern),
          ilike(accounts.displayName, pattern)
        )
      )
      .limit(20);

    // Also search by owner email
    const userResults = await db
      .select({
        id: accounts.id,
        alias: accounts.alias,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(accounts)
      .innerJoin(users, eq(accounts.ownerUserId, users.id))
      .where(ilike(users.email, pattern))
      .limit(10);

    // Combine and deduplicate
    const allResults = [...accountResults, ...userResults];
    const uniqueResults = allResults.filter(
      (item, index, self) => self.findIndex((t) => t.id === item.id) === index
    );

    return uniqueResults.slice(0, 20);
  }

  /**
   * Convert a personal account to business account
   */
  async convertToBusiness(accountId: string, userId: string) {
    // Verify ownership
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.ownerUserId, userId)))
      .limit(1);

    if (!account) {
      throw new Error('Account not found or unauthorized');
    }

    if (account.accountType === 'business') {
      throw new Error('Account is already a business account');
    }

    // Update account type to business
    const [updated] = await db
      .update(accounts)
      .set({
        accountType: 'business',
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();

    return updated;
  }

  async updateAccountAvatar(accountId: string, avatarAssetId: string): Promise<Account> {
    const [updatedAccount] = await db
      .update(accounts)
      .set({ 
        avatarAssetId,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, accountId))
      .returning();

    if (!updatedAccount) {
      throw new Error('Account not found');
    }

    return updatedAccount;
  }

}

export const accountService = new AccountService();
