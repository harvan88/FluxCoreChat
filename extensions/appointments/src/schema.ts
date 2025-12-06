/**
 * Schema de Base de Datos - Extensión de Turnos
 * 
 * Tablas:
 * - appointment_services: Servicios ofrecidos
 * - appointment_staff: Personal/empleados
 * - appointments: Turnos/citas
 */

import { pgTable, uuid, varchar, timestamp, integer, boolean, text, jsonb } from 'drizzle-orm/pg-core';

// Servicios ofrecidos
export const appointmentServices = pgTable('appointment_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull(), // Cuenta del negocio
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  duration: integer('duration').notNull().default(30), // Minutos
  price: integer('price'), // En centavos
  currency: varchar('currency', { length: 3 }).default('ARS'),
  active: boolean('active').default(true).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Personal/empleados que pueden atender
export const appointmentStaff = pgTable('appointment_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull(), // Cuenta del negocio
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  linkedAccountId: uuid('linked_account_id'), // Cuenta FluxCore del empleado (opcional)
  services: jsonb('services').default([]), // IDs de servicios que puede realizar
  schedule: jsonb('schedule').default({}), // Horarios específicos del empleado
  active: boolean('active').default(true).notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Turnos/citas
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull(), // Cuenta del negocio
  clientAccountId: uuid('client_account_id').notNull(), // Cuenta del cliente
  serviceId: uuid('service_id').notNull().references(() => appointmentServices.id),
  staffId: uuid('staff_id').references(() => appointmentStaff.id),
  
  // Fecha y hora
  date: timestamp('date').notNull(),
  duration: integer('duration').notNull(), // Minutos
  
  // Estado
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // pending, confirmed, completed, cancelled, no_show
  
  // Notas y metadata
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  metadata: jsonb('metadata').default({}),
  
  // Origen
  createdBy: varchar('created_by', { length: 20 }).default('customer').notNull(),
  // customer, staff, ai, system
  
  // Timestamps
  confirmedAt: timestamp('confirmed_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tipos inferidos
export type AppointmentService = typeof appointmentServices.$inferSelect;
export type NewAppointmentService = typeof appointmentServices.$inferInsert;
export type AppointmentStaff = typeof appointmentStaff.$inferSelect;
export type NewAppointmentStaff = typeof appointmentStaff.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// Tipos adicionales
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentCreator = 'customer' | 'staff' | 'ai' | 'system';

export interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
  staffId?: string;
  staffName?: string;
}

export interface DaySchedule {
  open: string; // HH:MM
  close: string; // HH:MM
}

export interface WeekSchedule {
  monday: DaySchedule | null;
  tuesday: DaySchedule | null;
  wednesday: DaySchedule | null;
  thursday: DaySchedule | null;
  friday: DaySchedule | null;
  saturday: DaySchedule | null;
  sunday: DaySchedule | null;
}
