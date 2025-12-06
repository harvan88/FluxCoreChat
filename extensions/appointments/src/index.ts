/**
 * @fluxcore/appointments - Extensión de Sistema de Turnos
 * 
 * Proporciona:
 * - Gestión de servicios y personal
 * - Reserva de turnos/citas
 * - Tools para integración con IA
 * - Verificación de disponibilidad
 */

import { AppointmentsService, getAppointmentsService } from './appointments.service';
import appointmentTools, { type ToolContext, type ToolResult } from './tools';
import manifest from '../manifest.json';

export interface AppointmentsConfig {
  businessHours?: Record<string, { open: string; close: string } | null>;
  slotDuration?: number;
  advanceBookingDays?: number;
  cancellationHours?: number;
  autoConfirm?: boolean;
}

export class AppointmentsExtension {
  private accountId: string;
  private config: AppointmentsConfig;
  private service: AppointmentsService;

  constructor(accountId: string, config: AppointmentsConfig = {}) {
    this.accountId = accountId;
    this.config = {
      slotDuration: 30,
      advanceBookingDays: 30,
      cancellationHours: 24,
      autoConfirm: false,
      ...config,
    };
    
    this.service = getAppointmentsService(accountId, this.config);
  }

  /**
   * Hook: Al instalar la extensión
   */
  async onInstall(): Promise<void> {
    console.log(`[appointments] Installed for account ${this.accountId}`);
    
    // Crear servicios de ejemplo
    await this.service.createService({
      name: 'Consulta General',
      description: 'Consulta de 30 minutos',
      duration: 30,
    });
  }

  /**
   * Hook: Al desinstalar la extensión
   */
  async onUninstall(): Promise<void> {
    console.log(`[appointments] Uninstalled from account ${this.accountId}`);
  }

  /**
   * Hook: Al cambiar configuración
   */
  async onConfigChange(newConfig: Partial<AppointmentsConfig>): Promise<void> {
    Object.assign(this.config, newConfig);
    console.log(`[appointments] Config updated for account ${this.accountId}`);
  }

  /**
   * Ejecutar una tool
   */
  async executeTool(
    toolName: string, 
    params: any, 
    context: Partial<ToolContext> = {}
  ): Promise<ToolResult> {
    const tool = appointmentTools[toolName as keyof typeof appointmentTools];
    
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" not found`,
      };
    }

    const fullContext: ToolContext = {
      accountId: this.accountId,
      ...context,
    };

    return tool(params, fullContext);
  }

  /**
   * Obtener manifest de la extensión
   */
  getManifest(): typeof manifest {
    return manifest;
  }

  /**
   * Obtener tools disponibles
   */
  getTools(): string[] {
    return Object.keys(appointmentTools);
  }

  /**
   * Obtener servicio interno
   */
  getService(): AppointmentsService {
    return this.service;
  }

  /**
   * Verificar disponibilidad (método directo)
   */
  async checkAvailability(date: string, service: string, time?: string) {
    return this.service.checkAvailability(date, service, time);
  }

  /**
   * Crear turno (método directo)
   */
  async createAppointment(data: {
    clientAccountId: string;
    serviceId: string;
    date: string;
    time: string;
    staffId?: string;
    notes?: string;
  }) {
    return this.service.createAppointment({
      ...data,
      createdBy: 'staff',
    });
  }

  /**
   * Obtener turnos (método directo)
   */
  async getAppointments(filters?: {
    clientAccountId?: string;
    date?: string;
    status?: string;
  }) {
    return this.service.getAppointments(filters as any);
  }

  /**
   * Cancelar turno (método directo)
   */
  async cancelAppointment(appointmentId: string, reason?: string) {
    return this.service.cancelAppointment(appointmentId, reason);
  }
}

// Factory
const instances: Map<string, AppointmentsExtension> = new Map();

export function getAppointmentsExtension(accountId: string, config?: AppointmentsConfig): AppointmentsExtension {
  if (!instances.has(accountId)) {
    instances.set(accountId, new AppointmentsExtension(accountId, config));
  }
  return instances.get(accountId)!;
}

export { AppointmentsService, getAppointmentsService, appointmentTools };
export type { ToolContext, ToolResult };
