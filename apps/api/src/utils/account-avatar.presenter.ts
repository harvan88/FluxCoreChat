import type { Account } from '@fluxcore/db';
import type { SignAssetParams } from '../services/asset-policy.service';
import { assetPolicyService } from '../services/asset-policy.service';

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
  channel: 'web' as const,
};

// ✅ Default avatar URL dentro del contrato del sistema
function getDefaultAvatarUrl(): string {
  // Por ahora, retornamos null para que el Avatar component use iniciales
  // En el futuro podría ser un asset system default
  return null as any;
}

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
    // ✅ ARQUITECTURA CORRECTA: Usar AssetPolicy como única fuente de verdad
    const signed = await assetPolicyService.signAsset({
      assetId: account.avatarAssetId,
      actorId: ctx.actorId,
      actorType: ctx.actorType ?? DEFAULT_CONTEXT.actorType,
      context: {
        action: ctx.action ?? DEFAULT_CONTEXT.action,
        channel: ctx.channel ?? DEFAULT_CONTEXT.channel,
      },
    });

    if (!signed?.url) {
      console.warn('[AvatarPresenter] ❌ AssetPolicy.signAsset() returned no URL', {
        accountId: account.id,
        avatarAssetId: account.avatarAssetId,
      });
      
      // ✅ MANEJO EXPLÍCITO: Default controlado sin violar contrato
      return {
        ...account,
        profile: {
          ...normalizeProfile(account.profile),
          avatarUrl: getDefaultAvatarUrl(), // Dentro del contrato del sistema
        },
      };
    }

    console.log('[AvatarPresenter] ✅ AssetPolicy URL SUCCESS', {
      accountId: account.id,
      avatarAssetId: account.avatarAssetId,
      signedUrl: signed.url,
      ttlSeconds: signed.ttlSeconds,
    });

    return {
      ...account,
      profile: {
        ...normalizeProfile(account.profile),
        avatarUrl: signed.url, // ✅ Única fuente de verdad
      },
    };
  } catch (error) {
    // ✅ MANEJO EXPLÍCITO: Sin fallback silencioso que viola el contrato
    console.error('[AvatarPresenter] ❌ AssetPolicy.signAsset() FAILED', {
      accountId: account.id,
      avatarAssetId: account.avatarAssetId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // ✅ OPCIÓN A: Error explícito (recomendado)
    throw new Error(`Cannot resolve avatar URL for account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // ✅ OPCIÓN B: Default controlado (alternativa)
    // return {
    //   ...account,
    //   profile: {
    //     ...normalizeProfile(account.profile),
    //     avatarUrl: getDefaultAvatarUrl(),
    //   },
    // };
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
