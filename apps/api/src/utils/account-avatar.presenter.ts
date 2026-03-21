import type { Account } from '@fluxcore/db';
import type { SignAssetParams } from '../services/asset-policy.service';
import { assetPolicyService } from '../services/asset-policy.service';
import { getStorageAdapter } from '../services/storage/storage-adapter.factory';
import { generateStorageKey } from '../services/storage/storage-adapter.interface';

export type PresentedAccount = Account & {
  profile: Record<string, any> & {
    avatarUrl?: string;
  };
};

interface AvatarPresentationContext {
  actorId: string;
  actorType?: SignAssetParams['actorType'];
  action?: SignAssetParams['context']['action'];
  channel?: SignAssetParams['context']['channel'];
}

const DEFAULT_CONTEXT: Required<Pick<AvatarPresentationContext, 'actorType' | 'action' | 'channel'>> = {
  actorType: 'user',
  action: 'preview',
  channel: 'unknown',
};

export async function presentAccountWithAvatar(
  account: Account,
  ctx: AvatarPresentationContext
): Promise<PresentedAccount> {
  if (!account.avatarAssetId) {
    return {
      ...account,
      profile: normalizeProfile(account.profile),
    };
  }

  try {
    // NUEVO: Intentar usar URL pública permanente primero
    const storage = getStorageAdapter();
    const storageKey = generateStorageKey(account.id, account.avatarAssetId);
    
    console.log('[AvatarPresenter] Attempting public URL generation', {
      accountId: account.id,
      avatarAssetId: account.avatarAssetId,
      storageKey,
    });

    const publicUrl = await storage.getPublicUrl(storageKey);

    // ÉXITO: URL pública generada correctamente
    console.log('[AvatarPresenter] ✅ Public URL SUCCESS', {
      accountId: account.id,
      avatarAssetId: account.avatarAssetId,
      publicUrl,
    });

    return {
      ...account,
      profile: {
        ...normalizeProfile(account.profile),
        avatarUrl: publicUrl,
      },
    };
  } catch (publicUrlError) {
    // FALLBACK EXPLÍCITO: Error público documentado
    console.warn('[AvatarPresenter] ⚠️ Public URL FAILED - Falling back to signed URL', {
      accountId: account.id,
      avatarAssetId: account.avatarAssetId,
      publicUrlError: publicUrlError.message,
      fallbackReason: 'Server route /avatars/ not available or file not found',
    });

    try {
      const signed = await assetPolicyService.signAsset({
        assetId: account.avatarAssetId,
        actorId: ctx.actorId,
        actorType: ctx.actorType ?? DEFAULT_CONTEXT.actorType,
        context: {
          action: ctx.action ?? DEFAULT_CONTEXT.action,
          channel: ctx.channel ?? DEFAULT_CONTEXT.channel,
        },
      });

      if (!signed) {
        console.error('[AvatarPresenter] ❌ Fallback FAILED - No signed URL generated', {
          accountId: account.id,
          avatarAssetId: account.avatarAssetId,
        });
        return {
          ...account,
          profile: normalizeProfile(account.profile),
        };
      }

      console.log('[AvatarPresenter] ✅ Fallback SUCCESS - Using signed URL', {
        accountId: account.id,
        avatarAssetId: account.avatarAssetId,
        signedUrl: signed.url,
        ttlSeconds: signed.ttlSeconds,
      });

      return {
        ...account,
        profile: {
          ...normalizeProfile(account.profile),
          avatarUrl: signed.url,
        },
      };
    } catch (fallbackError) {
      // ERROR FINAL: Ambos métodos fallaron
      console.error('[AvatarPresenter] ❌ COMPLETE FAILURE - No avatar URL available', {
        accountId: account.id,
        avatarAssetId: account.avatarAssetId,
        publicUrlError: publicUrlError.message,
        fallbackError: fallbackError.message,
      });

      return {
        ...account,
        profile: normalizeProfile(account.profile),
      };
    }
  }
}

export async function presentAccountsWithAvatar(
  accounts: Account[],
  ctx: AvatarPresentationContext
): Promise<PresentedAccount[]> {
  return Promise.all(accounts.map((account) => presentAccountWithAvatar(account, ctx)));
}

function normalizeProfile(profile: Account['profile']): PresentedAccount['profile'] {
  if (profile && typeof profile === 'object') {
    return profile as PresentedAccount['profile'];
  }
  return {} as PresentedAccount['profile'];
}
