import { templateService } from './template.service';
import { db, templates, fluxcoreCognitionQueue } from '@fluxcore/db';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * KeywordTriggerService — FluxCore v8.5
 * 
 * Interceptor determinista de mensajes.
 * Permite ejecutar plantillas automáticas y silenciar a la IA
 * cuando se detectan palabras clave (triggers).
 */
export class KeywordTriggerService {
  constructor() {
    console.log('[KeywordTriggerService] 🛠️ Service initialized (Deterministic mode)');
  }

    /**
     * Busca una coincidencia de palabra clave sin ejecutar la plantilla.
     * Útil para marcar el mensaje como interceptado antes de persistirlo.
     */
    async findMatch(params: { text: string; accountId?: string }) {
      const { text, accountId } = params;
      if (!accountId || !text) return null;

      const allTemplates = await templateService.listTemplates(accountId);
      const matchingTemplate = allTemplates.find(t => {
        if (!t.triggerKeyword || !t.isActive) return false;
        const keywords = t.triggerKeyword.split(',').map(k => k.trim().toLowerCase());
        const normalizedText = text.toLowerCase().trim();
        return keywords.some(k => normalizedText.includes(k));
      });

      return matchingTemplate || null;
    }
}

// Singleton instance
export const keywordTriggerService = new KeywordTriggerService();
