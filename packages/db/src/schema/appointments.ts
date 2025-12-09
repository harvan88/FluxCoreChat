import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * Servicios de turnos/citas
 */
export const appointmentServices = pgTable('appointment_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').default(30).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Personal/Staff para atender turnos
 */
export const appointmentStaff = pgTable('appointment_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  availability: jsonb('availability').default({}).notNull(), // { monday: [{start, end}], ... }
  services: jsonb('services').default([]).notNull(), // Array de service IDs
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Turnos/Citas agendadas
 */
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').references(() => appointmentServices.id, { onDelete: 'set null' }),
  staffId: uuid('staff_id').references(() => appointmentStaff.id, { onDelete: 'set null' }),
  clientAccountId: uuid('client_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  clientName: varchar('client_name', { length: 255 }),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 50 }),
  scheduledAt: timestamp('scheduled_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: text('notes'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AppointmentService = typeof appointmentServices.$inferSelect;
export type NewAppointmentService = typeof appointmentServices.$inferInsert;
export type AppointmentStaff = typeof appointmentStaff.$inferSelect;
export type NewAppointmentStaff = typeof appointmentStaff.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
