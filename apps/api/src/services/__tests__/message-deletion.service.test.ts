import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { messageDeletionService } from '../message-deletion.service';

// Mock de la base de datos
jest.mock('@fluxcore/db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([]))
        }))
      }))
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([]))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoNothing: jest.fn(() => Promise.resolve())
      }))
    }))
  },
  messages: {},
  messageVisibility: {}
}));

describe('MessageDeletionService - Overwrite Terminology', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('overwriteMessageForAll', () => {
    it('should return success when overwriting a message', async () => {
      // Mock de mensaje existente
      const mockMessage = {
        id: 'msg-1',
        senderAccountId: 'account-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos ago
        overwrittenAt: null
      };

      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMessage])
          })
        })
      });

      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ ...mockMessage, overwrittenAt: new Date() }])
          })
        })
      });

      const result = await messageDeletionService.overwriteMessageForAll('msg-1', 'account-1');
      
      expect(result.success).toBe(true);
      expect(result.overwrittenAt).toBeInstanceOf(Date);
    });

    it('should fail when message does not exist', async () => {
      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await messageDeletionService.overwriteMessageForAll('msg-1', 'account-1');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Message not found');
    });

    it('should fail when message is already overwritten', async () => {
      const mockMessage = {
        id: 'msg-1',
        senderAccountId: 'account-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        overwrittenAt: new Date() // Ya está sobrescrito
      };

      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMessage])
          })
        })
      });

      const result = await messageDeletionService.overwriteMessageForAll('msg-1', 'account-1');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Message already overwritten');
    });

    it('should fail when trying to overwrite after 60 minutes', async () => {
      const mockMessage = {
        id: 'msg-1',
        senderAccountId: 'account-1',
        createdAt: new Date(Date.now() - 61 * 60 * 1000), // 61 minutos ago
        overwrittenAt: null
      };

      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMessage])
          })
        })
      });

      const result = await messageDeletionService.overwriteMessageForAll('msg-1', 'account-1');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Cannot overwrite message after 60 minutes window');
    });
  });

  describe('Legacy Compatibility', () => {
    it('should redirect redactMessage to overwriteMessageForAll', async () => {
      const mockMessage = {
        id: 'msg-1',
        senderAccountId: 'account-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        overwrittenAt: null
      };

      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMessage])
          })
        })
      });

      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ ...mockMessage, overwrittenAt: new Date() }])
          })
        })
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await messageDeletionService.redactMessage('msg-1', 'account-1');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[MessageDeletion] DEPRECATED: redactMessage() called, use overwriteMessageForAll()'
      );
      expect(result.success).toBe(true);
      expect(result.redactedAt).toBeInstanceOf(Date);
      
      consoleSpy.mockRestore();
    });

    it('should redirect canRedact to canOverwrite', async () => {
      const mockMessage = {
        id: 'msg-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        overwrittenAt: null
      };

      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMessage])
          })
        })
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await messageDeletionService.canRedact('msg-1');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[MessageDeletion] DEPRECATED: canRedact() called, use canOverwrite()'
      );
      expect(result).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Utility Methods', () => {
    it('should return true for canOverwrite when message is recent', async () => {
      const mockMessage = {
        id: 'msg-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos ago
        overwrittenAt: null
      };

      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMessage])
          })
        })
      });

      const result = await messageDeletionService.canOverwrite('msg-1');
      expect(result).toBe(true);
    });

    it('should return false for canOverwrite when message is old', async () => {
      const mockMessage = {
        id: 'msg-1',
        createdAt: new Date(Date.now() - 61 * 60 * 1000), // 61 minutos ago
        overwrittenAt: null
      };

      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMessage])
          })
        })
      });

      const result = await messageDeletionService.canOverwrite('msg-1');
      expect(result).toBe(false);
    });

    it('should return time remaining for overwrite', async () => {
      const mockMessage = {
        id: 'msg-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos ago
        overwrittenAt: null
      };

      const { db } = await import('@fluxcore/db');
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMessage])
          })
        })
      });

      const result = await messageDeletionService.getTimeRemainingForOverwrite('msg-1');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(30 * 60); // Menos de 30 minutos restantes
    });
  });
});
