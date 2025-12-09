/**
 * Automation Routes
 * HITO-API-AUTOMATION: CRUD para automation_rules
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { automationController } from '../services/automation-controller.service';
import type { AutomationMode, AutomationConfig, AutomationTrigger } from '@fluxcore/db';

export const automationRoutes = new Elysia({ prefix: '/automation' })
  .use(authMiddleware)

  // GET /automation/rules/:accountId - Obtener todas las reglas de una cuenta
  .get('/rules/:accountId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const rules = await automationController.getRules(params.accountId);
      return {
        success: true,
        data: rules,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
  })

  // GET /automation/mode/:accountId - Obtener modo efectivo
  .get('/mode/:accountId', async ({ user, params, query, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const relationshipId = query.relationshipId as string | undefined;
      const mode = await automationController.getMode(params.accountId, relationshipId);
      const rule = await automationController.getEffectiveRule(params.accountId, relationshipId);
      
      return {
        success: true,
        data: {
          mode,
          rule,
          source: rule?.relationshipId ? 'relationship' : (rule ? 'account' : 'default'),
        },
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
    query: t.Object({
      relationshipId: t.Optional(t.String()),
    }),
  })

  // POST /automation/rules - Crear o actualizar regla
  .post('/rules', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { accountId, mode, relationshipId, config, enabled } = body as {
        accountId: string;
        mode: AutomationMode;
        relationshipId?: string;
        config?: AutomationConfig;
        enabled?: boolean;
      };

      // Validar modo
      if (!['automatic', 'supervised', 'disabled'].includes(mode)) {
        set.status = 400;
        return { success: false, message: 'Invalid mode. Must be: automatic, supervised, or disabled' };
      }

      const rule = await automationController.setRule(accountId, mode, {
        relationshipId,
        config,
        enabled,
      });

      return {
        success: true,
        data: rule,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      mode: t.String(),
      relationshipId: t.Optional(t.String()),
      config: t.Optional(t.Any()),
      enabled: t.Optional(t.Boolean()),
    }),
  })

  // POST /automation/trigger - Registrar un trigger
  .post('/trigger', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { accountId, trigger, relationshipId, mode } = body as {
        accountId: string;
        trigger: AutomationTrigger;
        relationshipId?: string;
        mode?: AutomationMode;
      };

      // Validar tipo de trigger
      if (!['message_received', 'keyword', 'schedule', 'webhook'].includes(trigger.type)) {
        set.status = 400;
        return { success: false, message: 'Invalid trigger type' };
      }

      const rule = await automationController.registerTrigger(accountId, trigger, {
        relationshipId,
        mode,
      });

      return {
        success: true,
        data: rule,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      trigger: t.Object({
        type: t.String(),
        value: t.Optional(t.String()),
      }),
      relationshipId: t.Optional(t.String()),
      mode: t.Optional(t.String()),
    }),
  })

  // POST /automation/evaluate - Evaluar si se debe procesar mensaje (para testing)
  .post('/evaluate', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { accountId, relationshipId, messageContent, messageType, senderId } = body as any;

      const result = await automationController.evaluateTrigger({
        accountId,
        relationshipId,
        messageContent,
        messageType,
        senderId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      relationshipId: t.Optional(t.String()),
      messageContent: t.Optional(t.String()),
      messageType: t.Optional(t.String()),
      senderId: t.Optional(t.String()),
    }),
  })

  // DELETE /automation/rules/:ruleId - Eliminar regla
  .delete('/rules/:ruleId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const deleted = await automationController.deleteRule(params.ruleId);

      if (!deleted) {
        set.status = 404;
        return { success: false, message: 'Rule not found' };
      }

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      ruleId: t.String(),
    }),
  })

  // PATCH /automation/rules/:ruleId - Actualizar regla existente (FC-530)
  .patch('/rules/:ruleId', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { mode, config, enabled } = body as any;

      const updated = await automationController.updateRuleById(params.ruleId, {
        mode,
        config,
        enabled,
      });

      if (!updated) {
        set.status = 404;
        return { success: false, message: 'Rule not found' };
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      ruleId: t.String(),
    }),
    body: t.Object({
      mode: t.Optional(t.String()),
      config: t.Optional(t.Any()),
      enabled: t.Optional(t.Boolean()),
    }),
  });
