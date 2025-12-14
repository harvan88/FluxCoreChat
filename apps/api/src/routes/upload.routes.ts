import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { accountService } from '../services/account.service';

// Get upload directory path
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');

// Ensure upload dir exists
await mkdir(UPLOAD_DIR, { recursive: true });

export const uploadRoutes = new Elysia({ prefix: '/upload' })
  .use(authMiddleware)
  .post(
    '/avatar',
    async ({ user, body, set, query }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const file = body.file as File;
      if (!file) {
        set.status = 400;
        return { success: false, message: 'No file uploaded' };
      }

      // Validate file type (basic check)
      if (!file.type.startsWith('image/')) {
        set.status = 400;
        return { success: false, message: 'Invalid file type. Only images are allowed.' };
      }

      // Get accountId from query parameter (for multi-account support)
      const accountId = query.accountId as string;
      
      // Generate filename
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${crypto.randomUUID()}.${extension}`;
      const filepath = join(UPLOAD_DIR, filename);

      try {
        await Bun.write(filepath, file);
        
        // Return relative URL
        const url = `/uploads/avatars/${filename}`;

        // Update account profile with avatar URL
        // If accountId is provided, update that specific account
        // Otherwise, update the first account (backward compatibility)
        let targetAccount;
        if (accountId) {
          targetAccount = await accountService.getAccountById(accountId);
          // Verify ownership
          if (targetAccount.ownerUserId !== user.id) {
            set.status = 403;
            return { success: false, message: 'Not authorized to update this account' };
          }
        } else {
          // Backward compatibility: update first account
          const userAccounts = await accountService.getAccountsByUserId(user.id);
          if (userAccounts.length === 0) {
            set.status = 404;
            return { success: false, message: 'No account found' };
          }
          targetAccount = userAccounts[0];
        }

        const currentProfile = targetAccount.profile || {};
        
        await accountService.updateAccount(targetAccount.id, user.id, {
          profile: {
            ...currentProfile,
            avatarUrl: url
          }
        });

        return {
          success: true,
          data: {
            url,
            filename,
            accountId: targetAccount.id
          }
        };
      } catch (error: any) {
        set.status = 500;
        return { 
          success: false, 
          message: error.message || 'Failed to upload file' 
        };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        file: t.File()
      }),
      detail: {
        tags: ['Upload'],
        summary: 'Upload avatar image'
      }
    }
  );
