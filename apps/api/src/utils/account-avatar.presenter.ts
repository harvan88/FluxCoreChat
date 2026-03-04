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
      return {
        ...account,
        profile: normalizeProfile(account.profile),
      };
    }

    return {
      ...account,
      profile: {
        ...normalizeProfile(account.profile),
        avatarUrl: signed.url,
      },
    };
  } catch (error) {
    console.error('[AvatarPresenter] Failed to sign avatar asset', {
      accountId: account.id,
      avatarAssetId: account.avatarAssetId,
      error,
    });

    return {
      ...account,
      profile: normalizeProfile(account.profile),
    };
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
