import type { FluxPolicyContext } from '@fluxcore/db';

/**
 * PromptBuilder - Construye prompts contextuales para la IA
 * 
 * Combina:
 * - Perfil público de la cuenta
 * - Contexto privado de la cuenta
 * - Contexto de la relación
 * - Historial de mensajes recientes
 * - Overlays de otras extensiones
 * - Canon v7.0: PolicyContext (Pre-resolved policies)
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

  assistantMeta?: {
    assistantId?: string;
    assistantName?: string;
    instructionIds?: string[];
    instructionLinks?: Array<{
      id: string;
      name?: string;
      order?: number;
      versionId?: string | null;
    }>;
    vectorStoreIds?: string[];
    vectorStores?: Array<{
      id: string;
      name?: string;
    }>;
    toolIds?: string[];
    tools?: Array<{
      id: string;
      name?: string;
    }>;
    modelConfig?: {
      provider?: string;
      model?: string;
      temperature?: number;
      topP?: number;
      responseFormat?: string;
    };

    effective?: {
      provider?: string;
      baseUrl?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    };
  };

  // RAG-008: Contexto de Base de Conocimiento
  ragContext?: {
    context: string;           // Texto formateado con chunks relevantes
    sources: Array<{           // Referencias a las fuentes
      content: string;         // Preview del contenido
      source: string;          // Nombre del documento/sección
      similarity: number;      // Score de similitud
    }>;
    totalTokens: number;       // Tokens usados por el contexto RAG
    chunksUsed: number;        // Cantidad de chunks incluidos
    vectorStoreIds?: string[]; // IDs de los vector stores consultados
  };

  // WES-170: Capacidades del Sistema de Ejecución de Trabajo (WES)
  wes?: {
    availableWorkDefinitions: Array<{
      id: string;
      typeId: string;
      description?: string;
      schema: any;
    }>;
    activeWork?: {
      id: string;
      typeId: string;
      state: string;
    };
  };

  /** Canon v7.0: PolicyContext (Pre-resolved policies) */
  policyContext?: FluxPolicyContext;
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

  constructor(private config: PromptConfig) { }

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
   * Las instrucciones base ahora SIEMPRE vienen de FluxCore (gestionadas dinámicamente)
   */
  private buildSystemPrompt(context: ContextData, _recipientAccountId: string, extraInstructions?: string[]): string {
    const sections: string[] = [];

    // Instrucciones del asistente (FluxCore Runtime)
    if (extraInstructions && extraInstructions.length > 0) {
      sections.push(extraInstructions.join('\n\n'));
    }

    // Canon v7.0: Aplicar Preferencias de Atención (Policy Layer)
    if (context.policyContext) {
      const { attention } = context.policyContext;
      sections.push('\n### Guías de Estilo (Políticas):');
      sections.push(`- Tono de voz: ${attention.tone}`);
      sections.push(`- Tratamiento al usuario: ${attention.formality}`);
      sections.push(`- Uso de emojis: ${attention.useEmojis ? 'Permitido (usar con moderación)' : 'Prohibido (no usar emojis)'}`);
      sections.push(`- Idioma: ${attention.language}`);
    }

    // RAG-008: Contexto de Base de Conocimiento (Vector Stores)
    // Se inyecta DESPUÉS de las instrucciones y ANTES del contexto de relación
    if (context.ragContext && context.ragContext.context) {
      sections.push('\n### Base de Conocimiento:');
      sections.push('Usa la siguiente información de la base de conocimiento para responder preguntas relevantes:');
      sections.push(context.ragContext.context);

      // Agregar nota sobre las fuentes disponibles
      if (context.ragContext.sources && context.ragContext.sources.length > 0) {
        sections.push(`\n(${context.ragContext.chunksUsed} fragmentos de ${context.ragContext.sources.length} fuentes consultadas)`);
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

    // WES-170: Instrucciones de Trabajo (WES)
    if (context.wes) {
      if (context.wes.activeWork) {
        sections.push('\n### TRABAJO ACTIVO:');
        sections.push(`Actualmente hay un proceso de "${context.wes.activeWork.typeId}" en curso (Estado: ${context.wes.activeWork.state}).`);
        sections.push('Prioriza completar los campos faltantes del esquema definido.');
      } else if (context.wes.availableWorkDefinitions.length > 0) {
        sections.push('\n### CAPACIDADES DE PROCESO (WES):');
        sections.push('Puedes iniciar procesos estructurados si el usuario lo solicita:');
        for (const def of context.wes.availableWorkDefinitions) {
          sections.push(`- ${def.typeId}: ${def.description || 'Sin descripción'}`);
        }
        sections.push('\nSi vas a iniciar un proceso, asegúrate de recolectar los datos iniciales necesarios.');
      }
    }

    if (this.config.mode === 'suggest') {
      sections.push('\n- Esta es una SUGERENCIA. El usuario la revisará antes de enviar.');
    }

    return sections.join('\n');
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
