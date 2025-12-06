/**
 * Appointments Routes - API para gestión de turnos
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { getAppointmentsExtension } from '../../../../extensions/appointments/src';

export const appointmentsRoutes = new Elysia({ prefix: '/appointments' })
  .use(authMiddleware)

  // GET /appointments/:accountId/services - Listar servicios
  .get('/:accountId/services', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const ext = getAppointmentsExtension(params.accountId);
      const services = await ext.getService().getServices();

      return {
        success: true,
        data: services,
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

  // POST /appointments/:accountId/services - Crear servicio
  .post('/:accountId/services', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { name, description, duration, price } = body as any;
      const ext = getAppointmentsExtension(params.accountId);
      const service = await ext.getService().createService({
        name,
        description,
        duration,
        price,
      });

      return {
        success: true,
        data: service,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      duration: t.Optional(t.Number()),
      price: t.Optional(t.Number()),
    }),
  })

  // GET /appointments/:accountId/availability - Verificar disponibilidad
  .get('/:accountId/availability', async ({ user, params, query, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { date, service, time } = query as any;

      if (!date || !service) {
        set.status = 400;
        return { success: false, message: 'date and service are required' };
      }

      const ext = getAppointmentsExtension(params.accountId);
      const result = await ext.checkAvailability(date, service, time);

      return {
        success: true,
        data: result,
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

  // GET /appointments/:accountId - Listar turnos
  .get('/:accountId', async ({ user, params, query, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { clientAccountId, date, status } = query as any;
      const ext = getAppointmentsExtension(params.accountId);
      const appointments = await ext.getAppointments({
        clientAccountId,
        date,
        status,
      });

      return {
        success: true,
        data: appointments,
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

  // POST /appointments/:accountId - Crear turno
  .post('/:accountId', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { clientAccountId, serviceId, date, time, staffId, notes } = body as any;

      if (!clientAccountId || !serviceId || !date || !time) {
        set.status = 400;
        return { success: false, message: 'clientAccountId, serviceId, date, and time are required' };
      }

      const ext = getAppointmentsExtension(params.accountId);
      const result = await ext.createAppointment({
        clientAccountId,
        serviceId,
        date,
        time,
        staffId,
        notes,
      });

      if (!result.success) {
        set.status = 400;
        return { success: false, message: result.error };
      }

      return {
        success: true,
        data: result.appointment,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
    }),
    body: t.Object({
      clientAccountId: t.String(),
      serviceId: t.String(),
      date: t.String(),
      time: t.String(),
      staffId: t.Optional(t.String()),
      notes: t.Optional(t.String()),
    }),
  })

  // DELETE /appointments/:accountId/:appointmentId - Cancelar turno
  .delete('/:accountId/:appointmentId', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { reason } = (body || {}) as any;
      const ext = getAppointmentsExtension(params.accountId);
      const result = await ext.cancelAppointment(params.appointmentId, reason);

      if (!result.success) {
        set.status = 400;
        return { success: false, message: result.error };
      }

      return {
        success: true,
        data: result.appointment,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      appointmentId: t.String(),
    }),
  })

  // POST /appointments/:accountId/tools/:toolName - Ejecutar tool de IA
  .post('/:accountId/tools/:toolName', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const ext = getAppointmentsExtension(params.accountId);
      const result = await ext.executeTool(params.toolName, body, {});

      if (!result.success) {
        set.status = 400;
      }

      return {
        success: result.success,
        data: result.data,
        message: result.message || result.error,
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      accountId: t.String(),
      toolName: t.String(),
    }),
  });

export default appointmentsRoutes;
