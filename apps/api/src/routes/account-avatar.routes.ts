import { Elysia, t } from 'elysia';
import { accountService } from '../services/account.service';
import { assetGatewayService } from '../services/asset-gateway.service';
import { assetRegistryService } from '../services/asset-registry.service';

interface KernelContext {
  accountId?: string;
  actorId?: string;
}

const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const accountAvatarRoutes = new Elysia({ prefix: '/api/accounts' })
  .post(
    '/:accountId/avatar/upload-session',
    async ({ params, kernelContext, body, set }: { params: { accountId: string }; kernelContext: KernelContext; body: any; set: any }) => {
      try {
        const { accountId } = params;
        const uploadedBy = kernelContext.actorId;

        const session = await assetGatewayService.createUploadSession({
          accountId,
          uploadedBy,
          allowedMimeTypes: AVATAR_MIME_TYPES,
          maxSizeBytes: AVATAR_MAX_SIZE_BYTES,
          fileName: body?.fileName,
          mimeType: body?.mimeType,
          ttlMinutes: 15,
        });

        return {
          success: true,
          data: {
            sessionId: session.id,
            expiresAt: session.expiresAt,
            maxSizeBytes: session.maxSizeBytes,
          },
        };
      } catch (error) {
        console.error('[AccountAvatarRoutes] Error creating avatar upload session:', error);
        set.status = 500;
        return {
          success: false,
          error: 'No se pudo crear la sesión de upload para avatar',
        };
      }
    },
    {
      params: t.Object({
        accountId: t.String(),
      }),
      body: t.Optional(
        t.Object({
          fileName: t.Optional(t.String()),
          mimeType: t.Optional(t.String()),
        })
      ),
    }
  )

  .post(
    '/:accountId/avatar/upload/:sessionId/commit',
    async ({ params, kernelContext, set }: { params: { accountId: string; sessionId: string }; kernelContext: KernelContext; set: any }) => {
      try {
        const { accountId, sessionId } = params;
        const uploadedBy = kernelContext.actorId;

        const result = await assetRegistryService.createFromUpload({
          sessionId,
          accountId,
          scope: 'profile_avatar',
          dedupPolicy: 'intra_account',
          uploadedBy,
          name: 'profile_avatar',
          metadata: { purpose: 'account_avatar' },
        });

        if (!result.success || !result.asset) {
          set.status = 400;
          return {
            success: false,
            error: result.error || 'No se pudo crear el asset de avatar',
          };
        }

        const updatedAccount = await accountService.updateAccountAvatar(accountId, result.asset.id);

        return {
          success: true,
          data: {
            asset: result.asset,
            account: updatedAccount,
          },
        };
      } catch (error) {
        console.error('[AccountAvatarRoutes] Error committing avatar upload:', error);
        set.status = 500;
        return {
          success: false,
          error: 'No se pudo completar el upload del avatar',
        };
      }
    },
    {
      params: t.Object({
        accountId: t.String(),
        sessionId: t.String(),
      }),
    }
  )

  .patch(
    '/:accountId/avatar',
    async ({ params, body }) => {
      try {
        const { accountId } = params;
        const { avatarAssetId } = body;

        console.log('[AccountAvatarRoutes] Updating avatar:', { accountId, avatarAssetId });

        const updatedAccount = await accountService.updateAccountAvatar(accountId, avatarAssetId);
        
        console.log('[AccountAvatarRoutes] Avatar updated successfully:', { accountId, updatedAccount });

        return {
          success: true,
          data: updatedAccount,
        };
      } catch (error) {
        console.error('[AccountAvatarRoutes] Error updating account avatar:', error);
        return {
          success: false,
          error: 'Error al actualizar avatar de la cuenta',
        };
      }
    },
    {
      params: t.Object({
        accountId: t.String(),
      }),
      body: t.Object({
        avatarAssetId: t.String(),
      }),
    }
  );
