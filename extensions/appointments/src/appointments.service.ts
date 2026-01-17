/**
 * Appointments Service - Lógica de negocio para turnos
 */

import type { 
  Appointment, 
  AppointmentService, 
  AppointmentStaff,
  TimeSlot,
  WeekSchedule,
  AppointmentStatus 
} from './schema';

// Simulated database (en producción sería Drizzle + PostgreSQL)
const servicesDb: Map<string, AppointmentService[]> = new Map();
const staffDb: Map<string, AppointmentStaff[]> = new Map();
const appointmentsDb: Map<string, Appointment[]> = new Map();

// Default business hours
const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: { open: '09:00', close: '13:00' },
  sunday: null,
};

export class AppointmentsService {
  private accountId: string;
  private slotDuration: number = 30;
  private schedule: WeekSchedule = DEFAULT_SCHEDULE;

  constructor(accountId: string, config?: { slotDuration?: number; businessHours?: WeekSchedule }) {
    this.accountId = accountId;
    if (config?.slotDuration) this.slotDuration = config.slotDuration;
    if (config?.businessHours) this.schedule = config.businessHours;
    
    // Initialize storage for this account
    if (!servicesDb.has(accountId)) servicesDb.set(accountId, []);
    if (!staffDb.has(accountId)) staffDb.set(accountId, []);
    if (!appointmentsDb.has(accountId)) appointmentsDb.set(accountId, []);
  }

  // ============ SERVICES ============

  async createService(data: { name: string; description?: string; duration?: number; price?: number }): Promise<AppointmentService> {
    const service: AppointmentService = {
      id: crypto.randomUUID(),
      accountId: this.accountId,
      name: data.name,
      description: data.description || null,
      duration: data.duration || 30,
      price: data.price || null,
      currency: 'ARS',
      active: true,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    servicesDb.get(this.accountId)!.push(service);
    return service;
  }

  async getServices(): Promise<AppointmentService[]> {
    return servicesDb.get(this.accountId)?.filter(s => s.active) || [];
  }

  async getServiceById(serviceId: string): Promise<AppointmentService | null> {
    return servicesDb.get(this.accountId)?.find(s => s.id === serviceId) || null;
  }

  async getServiceByName(name: string): Promise<AppointmentService | null> {
    const services = servicesDb.get(this.accountId) || [];
    return services.find(s => 
      s.active && s.name.toLowerCase().includes(name.toLowerCase())
    ) || null;
  }

  // ============ STAFF ============

  async createStaff(data: { name: string; email?: string; services?: string[] }): Promise<AppointmentStaff> {
    const staff: AppointmentStaff = {
      id: crypto.randomUUID(),
      accountId: this.accountId,
      name: data.name,
      email: data.email || null,
      phone: null,
      linkedAccountId: null,
      services: data.services || [],
      schedule: {},
      active: true,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    staffDb.get(this.accountId)!.push(staff);
    return staff;
  }

  async getStaff(): Promise<AppointmentStaff[]> {
    return staffDb.get(this.accountId)?.filter(s => s.active) || [];
  }

  async getStaffById(staffId: string): Promise<AppointmentStaff | null> {
    return staffDb.get(this.accountId)?.find(s => s.id === staffId) || null;
  }

  async getStaffForService(serviceId: string): Promise<AppointmentStaff[]> {
    const staff = staffDb.get(this.accountId) || [];
    return staff.filter(s => 
      s.active && (s.services as string[]).includes(serviceId)
    );
  }

  // ============ AVAILABILITY ============

  async checkAvailability(date: string, serviceId: string, preferredTime?: string): Promise<{
    available: boolean;
    slots: TimeSlot[];
    message: string;
  }> {
    const service = await this.getServiceById(serviceId);
    if (!service) {
      // Try to find by name
      const serviceByName = await this.getServiceByName(serviceId);
      if (!serviceByName) {
        return {
          available: false,
          slots: [],
          message: `Servicio "${serviceId}" no encontrado`,
        };
      }
    }

    const dateObj = new Date(date);
    const dayOfWeek = this.getDayOfWeek(dateObj);
    const daySchedule = this.schedule[dayOfWeek];

    if (!daySchedule) {
      return {
        available: false,
        slots: [],
        message: `No hay atención el ${this.getDayName(dayOfWeek)}`,
      };
    }

    // Generate available slots
    const slots = this.generateTimeSlots(daySchedule, service?.duration || 30);
    
    // Filter out booked slots
    const appointments = await this.getAppointmentsByDate(date);
    const availableSlots = slots.filter(slot => {
      const slotTime = this.parseTime(slot.time);
      return !appointments.some(apt => {
        const aptTime = apt.date.getHours() * 60 + apt.date.getMinutes();
        return Math.abs(slotTime - aptTime) < (apt.duration || 30);
      });
    });

    // Mark slots as available/unavailable
    const resultSlots = availableSlots.map(slot => ({
      ...slot,
      available: true,
    }));

    if (resultSlots.length === 0) {
      return {
        available: false,
        slots: [],
        message: `No hay turnos disponibles para ${date}`,
      };
    }

    // If preferred time, check if available
    if (preferredTime) {
      const preferredSlot = resultSlots.find(s => s.time === preferredTime);
      if (preferredSlot) {
        return {
          available: true,
          slots: [preferredSlot],
          message: `Turno disponible a las ${preferredTime}`,
        };
      } else {
        return {
          available: true,
          slots: resultSlots.slice(0, 5),
          message: `${preferredTime} no disponible. Horarios alternativos: ${resultSlots.slice(0, 3).map(s => s.time).join(', ')}`,
        };
      }
    }

    return {
      available: true,
      slots: resultSlots,
      message: `${resultSlots.length} turnos disponibles para ${date}`,
    };
  }

  // ============ APPOINTMENTS ============

  async createAppointment(data: {
    clientAccountId: string;
    serviceId: string;
    date: string;
    time: string;
    staffId?: string;
    notes?: string;
    createdBy?: 'customer' | 'staff' | 'ai' | 'system';
  }): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    // Validate service
    let service = await this.getServiceById(data.serviceId);
    if (!service) {
      service = await this.getServiceByName(data.serviceId);
    }
    if (!service) {
      return { success: false, error: `Servicio "${data.serviceId}" no encontrado` };
    }

    // Check availability
    const availability = await this.checkAvailability(data.date, service.id, data.time);
    if (!availability.available) {
      return { success: false, error: availability.message };
    }

    // Parse date and time
    const dateTime = new Date(`${data.date}T${data.time}:00`);

    const appointment: Appointment = {
      id: crypto.randomUUID(),
      accountId: this.accountId,
      clientAccountId: data.clientAccountId,
      serviceId: service.id,
      staffId: data.staffId || null,
      date: dateTime,
      duration: service.duration,
      status: 'pending',
      notes: data.notes || null,
      cancellationReason: null,
      metadata: {},
      createdBy: data.createdBy || 'customer',
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    appointmentsDb.get(this.accountId)!.push(appointment);

    return { success: true, appointment };
  }

  async getAppointments(filters?: {
    clientAccountId?: string;
    staffId?: string;
    date?: string;
    status?: AppointmentStatus;
  }): Promise<Appointment[]> {
    let appointments = appointmentsDb.get(this.accountId) || [];

    if (filters?.clientAccountId) {
      appointments = appointments.filter(a => a.clientAccountId === filters.clientAccountId);
    }
    if (filters?.staffId) {
      appointments = appointments.filter(a => a.staffId === filters.staffId);
    }
    if (filters?.date) {
      const filterDate = new Date(filters.date).toDateString();
      appointments = appointments.filter(a => a.date.toDateString() === filterDate);
    }
    if (filters?.status) {
      appointments = appointments.filter(a => a.status === filters.status);
    }

    return appointments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    return appointmentsDb.get(this.accountId)?.find(a => a.id === appointmentId) || null;
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return this.getAppointments({ date });
  }

  async updateAppointmentStatus(
    appointmentId: string, 
    status: AppointmentStatus,
    reason?: string
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const appointments = appointmentsDb.get(this.accountId) || [];
    const index = appointments.findIndex(a => a.id === appointmentId);

    if (index === -1) {
      return { success: false, error: 'Turno no encontrado' };
    }

    const appointment = appointments[index];
    appointment.status = status;
    appointment.updatedAt = new Date();

    if (status === 'confirmed') {
      appointment.confirmedAt = new Date();
    } else if (status === 'completed') {
      appointment.completedAt = new Date();
    } else if (status === 'cancelled') {
      appointment.cancelledAt = new Date();
      if (reason) appointment.cancellationReason = reason;
    }

    return { success: true, appointment };
  }

  async cancelAppointment(
    appointmentId: string, 
    reason?: string
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    return this.updateAppointmentStatus(appointmentId, 'cancelled', reason);
  }

  // ============ HELPERS ============

  private generateTimeSlots(schedule: { open: string; close: string }, duration: number): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const openMinutes = this.parseTime(schedule.open);
    const closeMinutes = this.parseTime(schedule.close);

    for (let minutes = openMinutes; minutes + duration <= closeMinutes; minutes += this.slotDuration) {
      slots.push({
        time: this.formatTime(minutes),
        available: true,
      });
    }

    return slots;
  }

  private parseTime(time: string): number {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private getDayOfWeek(date: Date): keyof WeekSchedule {
    const days: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private getDayName(day: keyof WeekSchedule): string {
    const names: Record<keyof WeekSchedule, string> = {
      monday: 'lunes',
      tuesday: 'martes',
      wednesday: 'miércoles',
      thursday: 'jueves',
      friday: 'viernes',
      saturday: 'sábado',
      sunday: 'domingo',
    };
    return names[day];
  }
}

// Factory para crear instancias por cuenta
const instances: Map<string, AppointmentsService> = new Map();

export function getAppointmentsService(accountId: string, config?: any): AppointmentsService {
  if (!instances.has(accountId)) {
    instances.set(accountId, new AppointmentsService(accountId, config));
  }
  return instances.get(accountId)!;
}

export default AppointmentsService;
