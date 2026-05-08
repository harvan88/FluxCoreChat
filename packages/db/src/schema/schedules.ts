/**
 * Universal Schedule System — Polymorphic Pattern
 * 
 * Uses ownerType + ownerId instead of direct FK to support
 * multiple entity types (locations, employees, services, etc.)
 * 
 * Decision D11: Schedule system designed as a pure module.
 * Today serves locations, tomorrow employees or appointments.
 */

import { pgTable, uuid, varchar, integer, boolean, time, date, index, primaryKey, unique } from 'drizzle-orm/pg-core';

// === Weekly Schedules (Regular) ===

export const weeklySchedules = pgTable('weekly_schedules', {
  ownerType: varchar('owner_type', { length: 30 }).notNull(),   // 'location' | 'employee' | 'service' | ...
  ownerId: uuid('owner_id').notNull(),                           // UUID of the owning entity
  dayOfWeek: integer('day_of_week').notNull(),                   // 0=Sunday ... 6=Saturday
  isClosed: boolean('is_closed').notNull().default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.ownerType, table.ownerId, table.dayOfWeek] }),
}));

// === Weekly Intervals (Time blocks within a day) ===

export const weeklyIntervals = pgTable('weekly_intervals', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerType: varchar('owner_type', { length: 30 }).notNull(),
  ownerId: uuid('owner_id').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),                   // 0...6
  openTime: time('open_time').notNull(),                         // '09:00:00'
  closeTime: time('close_time').notNull(),                       // '18:00:00'
}, (table) => ({
  lookupIdx: index('idx_weekly_intervals_lookup')
    .on(table.ownerType, table.ownerId, table.dayOfWeek, table.openTime),
}));
// Rule: If crosses midnight → split into two intervals in service layer

// === Special Dates (Holidays, events — override weekly) ===

export const specialDates = pgTable('special_dates', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerType: varchar('owner_type', { length: 30 }).notNull(),
  ownerId: uuid('owner_id').notNull(),
  date: date('date').notNull(),                                   // '2026-12-25'
  isClosed: boolean('is_closed').notNull().default(true),
  label: varchar('label', { length: 100 }),                       // "Navidad", "Feriado nacional"
}, (table) => ({
  lookupIdx: index('idx_special_dates_lookup')
    .on(table.ownerType, table.ownerId, table.date),
  unq: unique().on(table.ownerType, table.ownerId, table.date),
}));

// === Special Intervals (Time blocks for special dates) ===

export const specialIntervals = pgTable('special_intervals', {
  id: uuid('id').primaryKey().defaultRandom(),
  specialDateId: uuid('special_date_id')
    .notNull()
    .references(() => specialDates.id, { onDelete: 'cascade' }),
  openTime: time('open_time').notNull(),
  closeTime: time('close_time').notNull(),
});

// TypeScript types
export type WeeklySchedule = typeof weeklySchedules.$inferSelect;
export type NewWeeklySchedule = typeof weeklySchedules.$inferInsert;
export type WeeklyInterval = typeof weeklyIntervals.$inferSelect;
export type NewWeeklyInterval = typeof weeklyIntervals.$inferInsert;
export type SpecialDate = typeof specialDates.$inferSelect;
export type NewSpecialDate = typeof specialDates.$inferInsert;
export type SpecialInterval = typeof specialIntervals.$inferSelect;
export type NewSpecialInterval = typeof specialIntervals.$inferInsert;
