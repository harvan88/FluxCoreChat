import { Cron } from 'croner';
import { automationController } from './automation-controller.service';
import { db } from '@fluxcore/db';
import {
  automationRules,
  type AutomationRule,
  type AutomationConfig,
  type AutomationTrigger,
} from '@fluxcore/db';

interface ScheduledJobKey {
  accountId: string;
  ruleId: string;
  triggerIndex: number;
}

const buildKey = (key: ScheduledJobKey) =>
  `${key.accountId}|${key.ruleId}|${key.triggerIndex}`;

class AutomationSchedulerService {
  private jobs = new Map<string, Cron>();
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await this.refreshAll();
      console.log('[AutomationScheduler] Initialized');
    } catch (error) {
      console.error('[AutomationScheduler] Init failed:', error);
    }
  }

  async refreshAll() {
    this.clearAll();
    const rules = await db.select().from(automationRules);
    for (const rule of rules) {
      this.scheduleForRule(rule);
    }
  }

  async refreshAccount(accountId: string) {
    if (!this.initialized) {
      await this.init();
      return;
    }
    this.clearJobsForAccount(accountId);
    const rules = await automationController.getRules(accountId);
    for (const rule of rules) {
      this.scheduleForRule(rule);
    }
  }

  private clearAll() {
    for (const job of this.jobs.values()) {
      job.stop();
    }
    this.jobs.clear();
  }

  private clearJobsForAccount(accountId: string) {
    for (const [key, job] of this.jobs.entries()) {
      if (key.startsWith(`${accountId}|`)) {
        job.stop();
        this.jobs.delete(key);
      }
    }
  }

  private clearJobsForRule(ruleId: string) {
    for (const [key, job] of this.jobs.entries()) {
      if (key.split('|')[1] === ruleId) {
        job.stop();
        this.jobs.delete(key);
      }
    }
  }

  private scheduleForRule(rule: AutomationRule) {
    this.clearJobsForRule(rule.id);

    if (!rule.enabled) return;

    const config = rule.config as AutomationConfig | null;
    if (!config?.triggers || config.triggers.length === 0) return;

    config.triggers.forEach((trigger, index) => {
      if (trigger.type !== 'schedule') return;
      this.registerCron(rule, trigger, index);
    });
  }

  private registerCron(rule: AutomationRule, trigger: AutomationTrigger, index: number) {
    if (!trigger.value) {
      console.warn('[AutomationScheduler] Schedule trigger without cron expression', {
        ruleId: rule.id,
      });
      return;
    }

    try {
      const key = buildKey({ accountId: rule.accountId, ruleId: rule.id, triggerIndex: index });
      const metadata = (trigger as AutomationTrigger & { metadata?: Record<string, unknown> }).metadata;
      const timezone = typeof metadata?.timezone === 'string' ? metadata.timezone : undefined;

      const cron = new Cron(
        trigger.value,
        {
          timezone,
        },
        async () => {
          try {
            const evaluation = await automationController.evaluateTrigger({
              accountId: rule.accountId,
              relationshipId: rule.relationshipId ?? undefined,
              trigger,
            });

            if (!evaluation.shouldProcess) {
              return;
            }

            await automationController.executeWorkflow(rule.id, {
              accountId: rule.accountId,
              relationshipId: rule.relationshipId ?? undefined,
              trigger,
              payload: null,
            });
          } catch (error) {
            console.error('[AutomationScheduler] Workflow execution failed', {
              ruleId: rule.id,
              error,
            });
          }
        }
      );

      this.jobs.set(key, cron);
      console.log('[AutomationScheduler] Scheduled cron trigger', {
        ruleId: rule.id,
        cron: trigger.value,
        timezone,
      });
    } catch (error) {
      console.error('[AutomationScheduler] Invalid cron expression', {
        ruleId: rule.id,
        expression: trigger.value,
        error,
      });
    }
  }
}

export const automationScheduler = new AutomationSchedulerService();
