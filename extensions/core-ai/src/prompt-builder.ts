/**
 * PromptBuilder - Construye prompts contextuales para la IA
 * 
 * Combina:
 * - Perfil público de la cuenta
 * - Contexto privado de la cuenta
 * - Contexto de la relación
 * - Historial de mensajes recientes
 * - Overlays de otras extensiones
 */

export interface ContextData {
  account?: {
    id: string;
    username: string;
    displayName: string;
    bio?: string;
    publicContext?: Record<string, any>;
    privateContext?: string;
  };
  relationship?: {
    id: string;
    context?: Array<{
      type: string;
      content: string;
      authorId: string;
    }>;
    status: string;
  };
  conversation?: {
    id: string;
    channel: string;
    metadata?: Record<string, any>;
  };
  messages?: Array<{
    id: string;
    content: string;
    senderAccountId: string;
    senderUsername?: string;
    createdAt: Date;
    messageType: string;
  }>;
  overlays?: Record<string, any>;
}

export interface PromptConfig {
  mode: 'suggest' | 'auto' | 'off';
  maxTokens: number;
  temperature: number;
  model: string;
}

export interface BuiltPrompt {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  config: PromptConfig;
}

export class PromptBuilder {
  private readonly MAX_HISTORY_MESSAGES = 10;
  private readonly MAX_CONTEXT_LENGTH = 500;
  private readonly MAX_PRIVATE_CONTEXT_LENGTH = 5000;

  constructor(private config: PromptConfig) {}

  /**
   * Construye el prompt completo para la IA
   */
  build(context: ContextData, recipientAccountId: string, extraInstructions?: string[]): BuiltPrompt {
    const systemPrompt = this.buildSystemPrompt(context, recipientAccountId, extraInstructions);
    const messages = this.buildMessageHistory(context, recipientAccountId);

    return {
      systemPrompt,
      messages,
      config: this.config,
    };
  }

  /**
   * Construye el system prompt con todo el contexto
   */
  private buildSystemPrompt(context: ContextData, _recipientAccountId: string, extraInstructions?: string[]): string {
    const sections: string[] = [];

    // Instrucciones base o personalizadas del asistente
    if (extraInstructions && extraInstructions.length > 0) {
      // Si hay instrucciones del asistente (FluxCore Runtime), reemplazan o complementan la base
      // Por ahora, las ponemos PRIMERO como la verdad absoluta del comportamiento
      sections.push(extraInstructions.join('\n\n'));
      sections.push('\n--- Contexto Dinámico ---');
    } else {
      // Fallback a Cori si no hay asistente definido
      sections.push(`🤖 Eres Cori, asistente IA de la persona que ayuda a ${context.account?.displayName || 'el usuario'} a responder mensajes de forma natural y empática.`);
    }

    const now = new Date();
    const nowUtc = now.toISOString();
    let nowArgentina: string;
    try {
      nowArgentina = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
    } catch (_err) {
      nowArgentina = nowUtc;
    }

    sections.push('\n### Tiempo actual (momento de generar esta respuesta):');
    sections.push(`- UTC: ${nowUtc}`);
    sections.push(`- America/Argentina/Buenos_Aires: ${nowArgentina} (UTC-03:00)`);
    sections.push('Los timestamps del historial entre corchetes (ej: [2025-12-18T15:50:59.683Z]) están en UTC.');

    const privateContext = typeof context.account?.privateContext === 'string'
      ? context.account.privateContext.trim()
      : '';

    if (privateContext.length > 0) {
      sections.push('\n### Contexto para la IA:');
      sections.push(this.truncate(privateContext, this.MAX_PRIVATE_CONTEXT_LENGTH));
    }

    sections.push('Tu objetivo es generar respuestas que mantengan la voz y estilo del usuario.');
    sections.push('Responde de forma concisa y natural, como lo haría el usuario.');

    // Contexto del perfil
    if (context.account) {
      const profileContext = this.buildProfileContext(context.account);
      if (profileContext) {
        sections.push(`\n### Sobre ${context.account.displayName}:`);
        sections.push(profileContext);
      }
    }

    // Contexto de la relación
    if (context.relationship?.context && context.relationship.context.length > 0) {
      const relationshipContext = this.buildRelationshipContext(context.relationship.context);
      if (relationshipContext) {
        sections.push('\n### Contexto de la relación:');
        sections.push(relationshipContext);
      }
    }

    // Overlays de otras extensiones
    if (context.overlays && Object.keys(context.overlays).length > 0) {
      const overlayContext = this.buildOverlayContext(context.overlays);
      if (overlayContext) {
        sections.push('\n### Información adicional:');
        sections.push(overlayContext);
      }
    }

    // Instrucciones finales
    sections.push('\n### Instrucciones:');
    sections.push('- Mantén el tono consistente con los mensajes anteriores del usuario.');
    sections.push('- No uses emojis a menos que el usuario los use frecuentemente.');
    sections.push('- Responde en el mismo idioma del mensaje recibido.');
    sections.push('- Sé breve pero útil.');
    sections.push('- No incluyas timestamps ni prefijos tipo [2025-...Z] en tu respuesta.');

    if (this.config.mode === 'suggest') {
      sections.push('- Esta es una SUGERENCIA. El usuario la revisará antes de enviar.');
    }

    return sections.join('\n');
  }

  /**
   * Construye contexto del perfil del usuario
   */
  private buildProfileContext(account: ContextData['account']): string {
    if (!account) return '';

    const parts: string[] = [];

    if (account.bio) {
      parts.push(`Bio: ${this.truncate(account.bio, 200)}`);
    }

    if (account.publicContext) {
      const publicKeys = Object.keys(account.publicContext);
      if (publicKeys.length > 0) {
        parts.push(`Información pública: ${JSON.stringify(account.publicContext)}`);
      }
    }

    return this.truncate(parts.join('\n'), this.MAX_CONTEXT_LENGTH);
  }

  /**
   * Construye contexto de la relación
   */
  private buildRelationshipContext(context: Array<{ type: string; content: string; authorId: string }>): string {
    if (!context || context.length === 0) return '';

    const notes = context.filter(c => c.type === 'note').map(c => c.content);
    const preferences = context.filter(c => c.type === 'preference').map(c => c.content);
    const rules = context.filter(c => c.type === 'rule').map(c => c.content);

    const parts: string[] = [];

    if (notes.length > 0) {
      parts.push(`Notas: ${notes.join('; ')}`);
    }

    if (preferences.length > 0) {
      parts.push(`Preferencias: ${preferences.join('; ')}`);
    }

    if (rules.length > 0) {
      parts.push(`Reglas: ${rules.join('; ')}`);
    }

    return this.truncate(parts.join('\n'), this.MAX_CONTEXT_LENGTH);
  }

  /**
   * Construye contexto de overlays
   */
  private buildOverlayContext(overlays: Record<string, any>): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(overlays)) {
      if (value && typeof value === 'object') {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      }
    }

    return this.truncate(parts.join('\n'), this.MAX_CONTEXT_LENGTH);
  }

  /**
   * Construye el historial de mensajes para el contexto
   */
  private buildMessageHistory(context: ContextData, recipientAccountId: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!context.messages || context.messages.length === 0) {
      return [];
    }

    // Tomar los últimos N mensajes
    const recentMessages = context.messages
      .slice(-this.MAX_HISTORY_MESSAGES)
      .filter(m => m.messageType === 'text');

    return recentMessages.map(msg => {
      const ts = msg.createdAt instanceof Date
        ? msg.createdAt.toISOString()
        : new Date(msg.createdAt as any).toISOString();

      const content = typeof msg.content === 'string' ? msg.content : String(msg.content);
      const alreadyPrefixed = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\]\s/.test(content);

      return {
      // Desde la perspectiva del usuario que va a responder:
      // - Mensajes del otro usuario son "user" (el que pregunta)
      // - Mensajes propios son "assistant" (las respuestas)
      role: msg.senderAccountId === recipientAccountId ? 'assistant' : 'user' as 'user' | 'assistant',
      content: alreadyPrefixed ? content : `[${ts}] ${content}`,
      };
    });
  }

  /**
   * Trunca texto a una longitud máxima
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(config: Partial<PromptConfig>): void {
    Object.assign(this.config, config);
  }
}

export default PromptBuilder;
