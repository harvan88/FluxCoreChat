import type { RuntimeConfig } from '@fluxcore/db';
import type { AuthorizedRuntimeContext } from '../../core/fluxcore-types';
import { runtimeStyleService, type ResolvedRuntimeStyle } from './runtime-style.service';

interface BuildAuthorizedInstructionsSectionOptions {
  instructions?: string;
  title: string;
}

interface BuildAttentionSectionOptions {
  runtimeConfig?: RuntimeConfig;
  style?: ResolvedRuntimeStyle;
  contactRules: AuthorizedRuntimeContext['contactRules'];
  title: string;
  tonePrefix: string;
  emojiPrefix: string;
  languagePrefix: string;
  notesHeading: string;
  preferencesHeading: string;
  rulesHeading: string;
}

class RuntimeInstructionContextService {
  buildAuthorizedInstructionsSection(options: BuildAuthorizedInstructionsSectionOptions): string | null {
    const { instructions, title } = options;

    if (typeof instructions !== 'string' || instructions.trim().length === 0) {
      return null;
    }

    return `${title}\n\n${instructions.trim()}`;
  }

  buildAttentionSection(options: BuildAttentionSectionOptions): string {
    const {
      runtimeConfig,
      style,
      contactRules,
      title,
      tonePrefix,
      emojiPrefix,
      languagePrefix,
      notesHeading,
      preferencesHeading,
      rulesHeading,
    } = options;
    const resolvedStyle = style ?? runtimeStyleService.resolve(runtimeConfig as RuntimeConfig);
    const { tone, useEmojis, language } = resolvedStyle;
    const lines = [title];

    const toneMap: Record<string, string> = {
      formal: 'formal y profesional',
      casual: 'casual y relajado',
      neutral: 'neutro y claro',
    };

    // Solo inyectar si el usuario definió algo distinto al vacío o si queremos ser estrictos con la soberanía
    if (runtimeConfig?.tone) {
      lines.push(`${tonePrefix}${toneMap[tone] || tone}`);
    }
    
    if (runtimeConfig?.useEmojis !== undefined) {
      lines.push(`${emojiPrefix}${useEmojis ? 'sí, moderados' : 'no uses emojis'}`);
    }

    if (runtimeConfig?.language) {
      lines.push(`${languagePrefix}${language}`);
    }

    const notes = contactRules.filter((rule) => rule.type === 'note');
    const preferences = contactRules.filter((rule) => rule.type === 'preference');
    const rules = contactRules.filter((rule) => rule.type === 'rule');

    if (notes.length > 0) {
      lines.push(`\n${notesHeading}`);
      notes.forEach((note) => lines.push(`- ${note.content}`));
    }

    if (preferences.length > 0) {
      lines.push(`\n${preferencesHeading}`);
      preferences.forEach((preference) => lines.push(`- ${preference.content}`));
    }

    if (rules.length > 0) {
      lines.push(`\n${rulesHeading}`);
      rules.forEach((rule) => lines.push(`- ${rule.content}`));
    }

    return lines.join('\n');
  }
}

export const runtimeInstructionContextService = new RuntimeInstructionContextService();
