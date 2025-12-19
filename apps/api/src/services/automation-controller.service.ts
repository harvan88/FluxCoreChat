/**
 * COR-007: Automation Controller Service
 * 
 * Controla el modo de respuesta según TOTEM 9.9.1:
 * - automatic: IA responde automáticamente
 * - supervised: IA sugiere, humano aprueba
 * - disabled: Sin IA
 */

import { randomUUID } from 'crypto';
import { Cron } from 'croner';
import { db } from '@fluxcore/db';
import {
  automationRules,
  type AutomationRule,
  type AutomationMode,
  type AutomationConfig,
  type AutomationTrigger,
} from '@fluxcore/db';
import { eq, and, isNull } from 'drizzle-orm';

export class AutomationTriggerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AutomationTriggerError';
  }
}

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
  payload?: unknown;
  trigger?: AutomationTrigger;
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
    return (rule?.mode as AutomationMode) || 'supervised';
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
    let rule: AutomationRule | null = null;
    
    try {
      rule = await this.getEffectiveRule(context.accountId, context.relationshipId);
    } catch (error: any) {
      // Table may not exist, use default behavior
      console.warn('[AutomationController] Could not fetch rules:', error.message);
      return {
        shouldProcess: false,
        mode: 'disabled',
        rule: null,
        reason: 'Rules unavailable, using default disabled mode',
      };
    }
    
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
    if (context.trigger) {
      return triggers.some(
        (trigger) =>
          trigger.type === context.trigger?.type &&
          trigger.value === context.trigger?.value
      );
    }

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
          // Schedule triggers se ejecutan exclusivamente vía cron scheduler
          // Si llegamos aquí sin trigger explícito, no corresponde procesar
          break;
          
        case 'webhook':
          if (trigger.value && context.payload) {
            return true;
          }
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

    const condition = relationshipId
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
      .where(condition)
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(automationRules)
        .set({
          mode,
          enabled,
          config: config ?? existing.config,
          updatedAt: new Date(),
        })
        .where(eq(automationRules.id, existing.id))
        .returning();

      await this.notifyScheduler(accountId);
      return updated;
    }

    const [created] = await db
      .insert(automationRules)
      .values({
        accountId,
        relationshipId: relationshipId ?? null,
        mode,
        enabled,
        config: config ?? null,
      })
      .returning();

    await this.notifyScheduler(accountId);
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
   * FC-530: Actualizar regla por ID
   */
  async updateRuleById(
    ruleId: string,
    updates: {
      mode?: AutomationMode;
      enabled?: boolean;
      config?: AutomationConfig;
    }
  ): Promise<AutomationRule | null> {
    const [updated] = await db
      .update(automationRules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(automationRules.id, ruleId))
      .returning();
    
    return updated || null;
  }

  /**
   * Eliminar una regla
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const deleted = await db
      .delete(automationRules)
      .where(eq(automationRules.id, ruleId))
      .returning();

    if (deleted.length > 0) {
      await this.notifyScheduler(deleted[0].accountId);
      return true;
    }

    return false;
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
  ): Promise<{ rule: AutomationRule; trigger: AutomationTrigger }> {
    const currentRule = await this.getEffectiveRule(accountId, options.relationshipId);
    const config: AutomationConfig = {
      ...((currentRule?.config as AutomationConfig) || {}),
    };

    const triggers = [...(config.triggers || [])];

    const normalizedTrigger: AutomationTrigger & { metadata?: Record<string, unknown> } = {
      ...trigger,
    };

    if (normalizedTrigger.type === 'schedule') {
      const { value, metadata } = this.normalizeScheduleTrigger(normalizedTrigger);
      normalizedTrigger.value = value;
      normalizedTrigger.metadata = metadata;
    }

    if (normalizedTrigger.type === 'webhook') {
      normalizedTrigger.value = normalizedTrigger.value || randomUUID().replace(/-/g, '');
    }

    const existingIndex = triggers.findIndex(
      (t) => t.type === normalizedTrigger.type && t.value === normalizedTrigger.value
    );

    if (existingIndex >= 0) {
      triggers[existingIndex] = {
        ...triggers[existingIndex],
        ...normalizedTrigger,
      };
    } else {
      triggers.push(normalizedTrigger);
    }

    config.triggers = triggers;

    const mode = options.mode ?? (currentRule?.mode as AutomationMode) ?? 'automatic';
    const enabled = currentRule?.enabled ?? true;

    const rule = await this.setRule(accountId, mode, {
      relationshipId: options.relationshipId,
      config,
      enabled,
    });

    return {
      rule,
      trigger: normalizedTrigger,
    };
  }

  private normalizeScheduleTrigger(
    trigger: AutomationTrigger & { metadata?: Record<string, unknown> }
  ): { value: string; metadata: Record<string, unknown> } {
    const value = (trigger.value ?? '').trim();

    if (!value) {
      throw new AutomationTriggerError('Schedule trigger requires a cron expression.');
    }

    const metadata = trigger.metadata ?? {};
    const rawTimezone = metadata?.timezone;
    const timezone =
      typeof rawTimezone === 'string' && rawTimezone.trim().length > 0
        ? rawTimezone.trim()
        : undefined;

    const rawMatch = metadata?.match;
    const match = rawMatch === 'minute' ? 'minute' : 'cron';

    try {
      const cron = new Cron(value, { timezone }, () => {});
      cron.stop();
    } catch (error: any) {
      throw new AutomationTriggerError(`Invalid cron expression: ${error?.message ?? String(error)}`);
    }

    return {
      value,
      metadata: {
        match,
        ...(timezone ? { timezone } : {}),
      },
    };
  }

  private async findWebhookTrigger(token: string): Promise<{
    rule: AutomationRule | null;
    trigger: AutomationTrigger | null;
  }> {
    const rules = await db.select().from(automationRules);
    for (const rule of rules) {
      const config = rule.config as AutomationConfig | null;
      const trigger = config?.triggers?.find(
        (t) => t.type === 'webhook' && t.value === token
      );
      if (trigger) {
        return { rule, trigger };
      }
    }
    return { rule: null, trigger: null };
  }

  async triggerWebhook(
    token: string,
    payload: unknown
  ): Promise<{
    success: boolean;
    processed: boolean;
    reason?: string;
    actions?: WorkflowAction[];
  }> {
    const { rule, trigger } = await this.findWebhookTrigger(token);

    if (!rule || !trigger) {
      return {
        success: false,
        processed: false,
        reason: 'Webhook token not found',
      };
    }

    const evaluation = await this.evaluateTrigger({
      accountId: rule.accountId,
      relationshipId: rule.relationshipId ?? undefined,
      trigger,
      payload,
    });

    if (!evaluation.shouldProcess) {
      return {
        success: true,
        processed: false,
        reason: evaluation.reason,
      };
    }

    const workflowResult = await this.executeWorkflow(rule.id, {
      accountId: rule.accountId,
      relationshipId: rule.relationshipId ?? undefined,
      trigger,
      payload,
    });

    return {
      success: true,
      processed: workflowResult.success,
      actions: workflowResult.actions,
      reason: workflowResult.success ? undefined : 'Workflow execution failed',
    };
  }

  /**
   * Ejecutar workflow basado en regla
   */
  async executeWorkflow(
    ruleId: string,
    _context: TriggerContext
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

  private async notifyScheduler(accountId: string) {
    try {
      const { automationScheduler } = await import('./automation-scheduler.service');
      await automationScheduler.refreshAccount(accountId);
    } catch (error) {
      console.error('[AutomationController] Scheduler refresh failed', {
        accountId,
        error,
      });
    }
  }
}
// Singleton export
export const automationController = new AutomationControllerService();
