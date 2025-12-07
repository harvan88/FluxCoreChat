/**
 * COR-007: Automation Controller Service
 * 
 * Controla el modo de respuesta según TOTEM 9.9.1:
 * - automatic: IA responde automáticamente
 * - supervised: IA sugiere, humano aprueba
 * - disabled: Sin IA
 */

import { db } from '@fluxcore/db';
import { 
  automationRules, 
  type AutomationRule, 
  type AutomationMode,
  type AutomationConfig,
  type AutomationTrigger 
} from '@fluxcore/db';
import { eq, and, isNull, or } from 'drizzle-orm';

/**
 * Resultado de evaluación de trigger
 */
export interface TriggerEvaluation {
  shouldProcess: boolean;
  mode: AutomationMode;
  rule: AutomationRule | null;
  reason: string;
}

/**
 * Contexto para evaluar triggers
 */
export interface TriggerContext {
  accountId: string;
  relationshipId?: string;
  messageContent?: string;
  messageType?: 'incoming' | 'outgoing' | 'system';
  senderId?: string;
}

/**
 * Workflow de automatización
 */
export interface AutomationWorkflow {
  ruleId: string;
  accountId: string;
  relationshipId?: string;
  trigger: AutomationTrigger;
  actions: WorkflowAction[];
}

/**
 * Acción de workflow
 */
export interface WorkflowAction {
  type: 'generate_response' | 'suggest_response' | 'notify' | 'custom';
  extensionId?: string;
  params?: Record<string, unknown>;
}

/**
 * Automation Controller - Singleton
 */
class AutomationControllerService {
  /**
   * Obtener el modo de automatización para un account/relationship
   * Prioridad: relationship > account global > default (supervised)
   */
  async getMode(accountId: string, relationshipId?: string): Promise<AutomationMode> {
    const rule = await this.getEffectiveRule(accountId, relationshipId);
    return rule?.mode as AutomationMode || 'supervised';
  }

  /**
   * Obtener la regla efectiva (relationship-specific o global)
   */
  async getEffectiveRule(
    accountId: string, 
    relationshipId?: string
  ): Promise<AutomationRule | null> {
    // Primero buscar regla específica del relationship
    if (relationshipId) {
      const [relationshipRule] = await db
        .select()
        .from(automationRules)
        .where(
          and(
            eq(automationRules.accountId, accountId),
            eq(automationRules.relationshipId, relationshipId),
            eq(automationRules.enabled, true)
          )
        )
        .limit(1);

      if (relationshipRule) {
        return relationshipRule;
      }
    }

    // Luego buscar regla global del account
    const [globalRule] = await db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.accountId, accountId),
          isNull(automationRules.relationshipId),
          eq(automationRules.enabled, true)
        )
      )
      .limit(1);

    return globalRule || null;
  }

  /**
   * Evaluar si se debe procesar un mensaje con IA
   */
  async evaluateTrigger(context: TriggerContext): Promise<TriggerEvaluation> {
    const rule = await this.getEffectiveRule(context.accountId, context.relationshipId);
    
    // Sin regla = modo supervised por defecto
    if (!rule) {
      return {
        shouldProcess: true,
        mode: 'supervised',
        rule: null,
        reason: 'No rule configured, using default supervised mode',
      };
    }

    const mode = rule.mode as AutomationMode;

    // Modo disabled = no procesar IA
    if (mode === 'disabled') {
      return {
        shouldProcess: false,
        mode: 'disabled',
        rule,
        reason: 'Automation disabled for this account/relationship',
      };
    }

    // Verificar triggers específicos si existen
    const config = rule.config as AutomationConfig | null;
    if (config?.triggers && config.triggers.length > 0) {
      const triggerMatched = this.matchTriggers(config.triggers, context);
      if (!triggerMatched) {
        return {
          shouldProcess: false,
          mode,
          rule,
          reason: 'No trigger matched',
        };
      }
    }

    // Verificar condiciones si existen
    if (config?.conditions && config.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(config.conditions, context);
      if (!conditionsMet) {
        return {
          shouldProcess: false,
          mode,
          rule,
          reason: 'Conditions not met',
        };
      }
    }

    return {
      shouldProcess: true,
      mode,
      rule,
      reason: `Processing in ${mode} mode`,
    };
  }

  /**
   * Verificar si algún trigger coincide
   */
  private matchTriggers(triggers: AutomationTrigger[], context: TriggerContext): boolean {
    for (const trigger of triggers) {
      switch (trigger.type) {
        case 'message_received':
          // Siempre coincide para mensajes incoming
          if (context.messageType === 'incoming') return true;
          break;
          
        case 'keyword':
          // Verificar si el mensaje contiene la keyword
          if (trigger.value && context.messageContent) {
            const pattern = new RegExp(trigger.value, 'i');
            if (pattern.test(context.messageContent)) return true;
          }
          break;
          
        case 'schedule':
          // TODO: Implementar triggers programados
          break;
          
        case 'webhook':
          // TODO: Implementar triggers de webhook
          break;
      }
    }
    return false;
  }

  /**
   * Evaluar condiciones
   */
  private evaluateConditions(
    conditions: NonNullable<AutomationConfig['conditions']>, 
    context: TriggerContext
  ): boolean {
    for (const condition of conditions) {
      let value: string | undefined;
      
      switch (condition.field) {
        case 'message_type':
          value = context.messageType;
          break;
        case 'sender':
          value = context.senderId;
          break;
        case 'message_content':
          value = context.messageContent;
          break;
        case 'time_of_day':
          value = new Date().getHours().toString();
          break;
      }

      if (!value) continue;

      const conditionValue = Array.isArray(condition.value) 
        ? condition.value 
        : [condition.value];

      switch (condition.operator) {
        case 'equals':
          if (!conditionValue.includes(value)) return false;
          break;
        case 'contains':
          if (!conditionValue.some(v => value!.includes(v))) return false;
          break;
        case 'regex':
          const pattern = new RegExp(conditionValue[0]);
          if (!pattern.test(value)) return false;
          break;
        case 'between':
          const num = parseInt(value);
          const [min, max] = conditionValue.map(Number);
          if (num < min || num > max) return false;
          break;
      }
    }
    return true;
  }

  /**
   * Crear o actualizar regla de automatización
   */
  async setRule(
    accountId: string,
    mode: AutomationMode,
    options: {
      relationshipId?: string;
      config?: AutomationConfig;
      enabled?: boolean;
    } = {}
  ): Promise<AutomationRule> {
    const { relationshipId, config, enabled = true } = options;

    // Buscar regla existente
    const existingCondition = relationshipId
      ? and(
          eq(automationRules.accountId, accountId),
          eq(automationRules.relationshipId, relationshipId)
        )
      : and(
          eq(automationRules.accountId, accountId),
          isNull(automationRules.relationshipId)
        );

    const [existing] = await db
      .select()
      .from(automationRules)
      .where(existingCondition)
      .limit(1);

    if (existing) {
      // Actualizar existente
      const [updated] = await db
        .update(automationRules)
        .set({
          mode,
          enabled,
          config: config || existing.config,
          updatedAt: new Date(),
        })
        .where(eq(automationRules.id, existing.id))
        .returning();
      
      return updated;
    }

    // Crear nueva
    const [created] = await db
      .insert(automationRules)
      .values({
        accountId,
        relationshipId: relationshipId || null,
        mode,
        enabled,
        config: config || null,
      })
      .returning();

    return created;
  }

  /**
   * Obtener todas las reglas de un account
   */
  async getRules(accountId: string): Promise<AutomationRule[]> {
    return db
      .select()
      .from(automationRules)
      .where(eq(automationRules.accountId, accountId));
  }

  /**
   * Eliminar una regla
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const result = await db
      .delete(automationRules)
      .where(eq(automationRules.id, ruleId))
      .returning();
    
    return result.length > 0;
  }

  /**
   * Registrar un trigger para un workflow
   */
  async registerTrigger(
    accountId: string,
    trigger: AutomationTrigger,
    options: {
      relationshipId?: string;
      mode?: AutomationMode;
    } = {}
  ): Promise<AutomationRule> {
    const rule = await this.getEffectiveRule(accountId, options.relationshipId);
    const config: AutomationConfig = (rule?.config as AutomationConfig) || {};
    
    // Añadir trigger si no existe
    const triggers = config.triggers || [];
    const exists = triggers.some(
      t => t.type === trigger.type && t.value === trigger.value
    );
    
    if (!exists) {
      triggers.push(trigger);
    }

    return this.setRule(accountId, options.mode || 'automatic', {
      relationshipId: options.relationshipId,
      config: { ...config, triggers },
    });
  }

  /**
   * Ejecutar workflow basado en regla
   */
  async executeWorkflow(
    ruleId: string,
    context: TriggerContext
  ): Promise<{ success: boolean; actions: WorkflowAction[] }> {
    const [rule] = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.id, ruleId))
      .limit(1);

    if (!rule || !rule.enabled) {
      return { success: false, actions: [] };
    }

    const config = rule.config as AutomationConfig | null;
    const mode = rule.mode as AutomationMode;

    // Determinar acciones basadas en modo
    const actions: WorkflowAction[] = [];

    if (mode === 'automatic') {
      actions.push({
        type: 'generate_response',
        extensionId: config?.extensionId || 'core-ai',
      });
    } else if (mode === 'supervised') {
      actions.push({
        type: 'suggest_response',
        extensionId: config?.extensionId || 'core-ai',
      });
    }

    return { success: true, actions };
  }
}

// Singleton export
export const automationController = new AutomationControllerService();
