import { describe, it, expect } from 'bun:test';
import { normalizeTemplateInput, assertTemplateScope } from './template.service';

describe('TemplateService utils', () => {
  describe('normalizeTemplateInput', () => {
    it('fills defaults for optional fields', () => {
      const input = normalizeTemplateInput({
        name: '  Welcome  ',
        content: 'Hello',
      });

      expect(input).toEqual({
        name: 'Welcome',
        content: 'Hello',
        category: null,
        variables: [],
        tags: [],
        isActive: true,
      });
    });

    it('preserves provided metadata', () => {
      const input = normalizeTemplateInput({
        name: 'Offer',
        content: 'Hola {{name}}',
        category: 'promotion',
        variables: [{ name: 'name', type: 'text', required: true }],
        tags: ['sale'],
        isActive: false,
      });

      expect(input.category).toBe('promotion');
      expect(input.variables).toHaveLength(1);
      expect(input.tags).toEqual(['sale']);
      expect(input.isActive).toBe(false);
    });
  });

  describe('assertTemplateScope', () => {
    it('allows access when template belongs to account', () => {
      expect(() => assertTemplateScope('acc-1', 'acc-1')).not.toThrow();
    });

    it('throws when accountId mismatches', () => {
      expect(() => assertTemplateScope('acc-1', 'acc-2')).toThrow('Template does not belong to account');
    });

    it('throws when template account is undefined', () => {
      expect(() => assertTemplateScope(undefined, 'acc-1')).toThrow('Template does not belong to account');
    });
  });
});
