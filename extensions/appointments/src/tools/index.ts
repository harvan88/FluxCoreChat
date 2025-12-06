/**
 * Appointments Tools - Herramientas para IA
 * 
 * Estas tools son registradas en el sistema de extensiones
 * y pueden ser invocadas por extensiones IA avanzadas.
 */

import { getAppointmentsService } from '../appointments.service';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ToolContext {
  accountId: string;
  clientAccountId?: string;
  conversationId?: string;
}

/**
 * Tool: check_availability
 * Verifica disponibilidad de horarios
 */
export async function checkAvailability(
  params: { date: string; service: string; time?: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const service = getAppointmentsService(context.accountId);
    const result = await service.checkAvailability(params.date, params.service, params.time);

    return {
      success: result.available,
      data: {
        available: result.available,
        slots: result.slots.slice(0, 5), // Limitar a 5 slots
        message: result.message,
      },
      message: result.message,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Tool: create_appointment
 * Crea un nuevo turno
 */
export async function createAppointment(
  params: {
    clientAccountId: string;
    date: string;
    time: string;
    serviceId: string;
    staffId?: string;
    notes?: string;
  },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const service = getAppointmentsService(context.accountId);
    
    // Usar el clientAccountId del contexto si no se proporciona
    const clientId = params.clientAccountId || context.clientAccountId;
    if (!clientId) {
      return {
        success: false,
        error: 'Se requiere el ID del cliente',
      };
    }

    const result = await service.createAppointment({
      clientAccountId: clientId,
      serviceId: params.serviceId,
      date: params.date,
      time: params.time,
      staffId: params.staffId,
      notes: params.notes,
      createdBy: 'ai',
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: {
        appointmentId: result.appointment!.id,
        date: result.appointment!.date.toISOString(),
        status: result.appointment!.status,
      },
      message: `Turno creado exitosamente para ${params.date} a las ${params.time}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Tool: get_appointments
 * Obtiene turnos de un cliente o empleado
 */
export async function getAppointments(
  params: { accountId: string; date?: string; status?: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const service = getAppointmentsService(context.accountId);
    const appointments = await service.getAppointments({
      clientAccountId: params.accountId,
      date: params.date,
      status: params.status as any,
    });

    return {
      success: true,
      data: {
        count: appointments.length,
        appointments: appointments.map(a => ({
          id: a.id,
          date: a.date.toISOString(),
          status: a.status,
          serviceId: a.serviceId,
        })),
      },
      message: `${appointments.length} turno(s) encontrado(s)`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Tool: cancel_appointment
 * Cancela un turno existente
 */
export async function cancelAppointment(
  params: { appointmentId: string; reason?: string },
  context: ToolContext
): Promise<ToolResult> {
  try {
    const service = getAppointmentsService(context.accountId);
    const result = await service.cancelAppointment(params.appointmentId, params.reason);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: {
        appointmentId: params.appointmentId,
        status: 'cancelled',
      },
      message: 'Turno cancelado exitosamente',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Registro de todas las tools
export const appointmentTools = {
  check_availability: checkAvailability,
  create_appointment: createAppointment,
  get_appointments: getAppointments,
  cancel_appointment: cancelAppointment,
};

export default appointmentTools;
