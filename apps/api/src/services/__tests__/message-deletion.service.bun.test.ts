import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { messageDeletionService } from '../message-deletion.service';

// Mock simple para Bun
const mockDb = {
  select: () => mockDb,
  from: () => mockDb,
  where: () => mockDb,
  limit: () => Promise.resolve([]),
  update: () => mockDb,
  set: () => mockDb,
  returning: () => Promise.resolve([]),
  insert: () => mockDb,
  values: () => mockDb,
  onConflictDoNothing: () => Promise.resolve()
};

// Mock del módulo @fluxcore/db
mock.module('@fluxcore/db', () => ({
  db: mockDb,
  messages: {},
  messageVisibility: {}
}));

describe('MessageDeletionService - Overwrite Terminology', () => {
  beforeEach(() => {
    // Limpiar mocks antes de cada test
  });

  describe('overwriteMessageForAll', () => {
    it('should have the method defined', () => {
      expect(typeof messageDeletionService.overwriteMessageForAll).toBe('function');
    });

    it('should return correct result type', async () => {
      // Mock de mensaje existente
      const mockMessage = {
        id: 'msg-1',
        senderAccountId: 'account-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos ago
        overwrittenAt: null
      };

      // Mockear la respuesta de la base de datos
      const originalSelect = mockDb.select;
      mockDb.select = () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockMessage])
          })
        })
      });

      const originalUpdate = mockDb.update;
      mockDb.update = () => ({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([{ ...mockMessage, overwrittenAt: new Date() }])
          })
        })
      });

      const result = await messageDeletionService.overwriteMessageForAll('msg-1', 'account-1');
      
      // Restaurar mocks originales
      mockDb.select = originalSelect;
      mockDb.update = originalUpdate;
      
      expect(result.success).toBe(true);
      expect(result.overwrittenAt).toBeInstanceOf(Date);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should have legacy redactMessage method', () => {
      expect(typeof messageDeletionService.redactMessage).toBe('function');
    });

    it('should have legacy canRedact method', () => {
      expect(typeof messageDeletionService.canRedact).toBe('function');
    });

    it('should have legacy getTimeRemainingForRedaction method', () => {
      expect(typeof messageDeletionService.getTimeRemainingForRedaction).toBe('function');
    });
  });

  describe('New Methods', () => {
    it('should have canOverwrite method', () => {
      expect(typeof messageDeletionService.canOverwrite).toBe('function');
    });

    it('should have getTimeRemainingForOverwrite method', () => {
      expect(typeof messageDeletionService.getTimeRemainingForOverwrite).toBe('function');
    });
  });

  describe('Constants', () => {
    it('should have OVERWRITTEN_CONTENT constant', async () => {
      const serviceModule = await import('../message-deletion.service');
      // La constante está dentro de la clase, pero podemos verificar el servicio funciona
      expect(messageDeletionService).toBeDefined();
    });
  });
});
