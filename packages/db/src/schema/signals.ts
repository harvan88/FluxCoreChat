/**
 * FluxCore Signals - Database Schema
 * Tabla de notificaciones unificadas para toda la plataforma
 */

import { pgTable, text, timestamp, jsonb, boolean, index, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { accounts, users } from './core-schema';

// Enums para tipos y prioridades
export const signalTypeEnum = pgEnum('signal_type', [
  'channel_message',
  'channel_mention',
  'task_assigned',
  'ai_suggestion',
  'channel_invite',
  'role_changed',
  'security_alert',
  'fluxcore_update',
  'mention_group',
  'reaction_received',
  'system_announcement',
  'workflow_trigger',
  'approval_required',
  'deadline_approaching'
]);

export const signalPriorityEnum = pgEnum('signal_priority', [
  'low',
  'medium',
  'high',
  'critical'
]);

export const signalDeliveryChannelEnum = pgEnum('signal_delivery_channel', [
  'websocket',
  'email',
  'push',
  'sms',
  'in_app'
]);

export const signalStatusEnum = pgEnum('signal_status', [
  'pending',
  'delivered',
  'read',
  'archived',
  'dismissed'
]);

/**
 * Tabla principal de señales/notificaciones
 */
export const signals = pgTable('signals', {
  // Identificación
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Destinatario (obligatorio - toda notificación tiene un destinatario)
  recipientAccountId: uuid('recipient_account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
  recipientUserId: uuid('recipient_user_id')
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Remitente (puede ser null para notificaciones de sistema)
  senderAccountId: uuid('sender_account_id')
    .references(() => accounts.id, { onDelete: 'set null' }),
  senderUserId: uuid('sender_user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  senderType: text('sender_type', { enum: ['user', 'system', 'ai', 'workflow', 'integration'] })
    .default('system'),
  
  // Tipo y categorización
  type: signalTypeEnum('type').notNull(),
  priority: signalPriorityEnum('priority').default('medium').notNull(),
  
  // Contenido
  title: text('title').notNull(),
  body: text('body').notNull(),
  
  // Contexto de navegación (deep linking)
  actionUrl: text('action_url'), // URL para navegar al hacer clic
  actionLabel: text('action_label').default('Ver'), // Texto del botón de acción
  
  // Metadata estructurada según el tipo
  metadata: jsonb('metadata').default({}).notNull(),
  
  // Estados
  status: signalStatusEnum('status').default('pending').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  
  // Delivery tracking
  deliveredVia: signalDeliveryChannelEnum('delivered_via').array().default([]),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  
  // Expiración
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  
  // Agrupación para notificaciones relacionadas
  groupId: text('group_id'), // Para agrupar notificaciones similares
  groupCount: integer('group_count').default(1), // Cantidad en el grupo
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  
  // Soft delete (para historial)
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' })
}, (table) => ({
  // Índices para queries comunes
  recipientAccountIdx: index('idx_signals_recipient_account')
    .on(table.recipientAccountId),
  recipientUserIdx: index('idx_signals_recipient_user')
    .on(table.recipientUserId),
  statusIdx: index('idx_signals_status')
    .on(table.status),
  isReadIdx: index('idx_signals_is_read')
    .on(table.isRead),
  typeIdx: index('idx_signals_type')
    .on(table.type),
  priorityIdx: index('idx_signals_priority')
    .on(table.priority),
  createdAtIdx: index('idx_signals_created_at')
    .on(table.createdAt),
  // Índice compuesto para queries de inbox
  recipientUnreadIdx: index('idx_signals_recipient_unread')
    .on(table.recipientAccountId, table.isRead, table.createdAt),
  // Índice para agrupación
  groupIdIdx: index('idx_signals_group_id')
    .on(table.groupId),
}));

/**
 * Preferencias de notificaciones por usuario
 */
export const signalPreferences = pgTable('signal_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // Una sola preferencia por usuario
  
  // Configuración por tipo de notificación
  typeSettings: jsonb('type_settings').default({}).notNull(),
  // Ejemplo: {
  //   "channel_message": { "websocket": true, "email": false, "push": true },
  //   "security_alert": { "websocket": true, "email": true, "push": true, "sms": true }
  // }
  
  // Horario de silencio
  quietHoursStart: text('quiet_hours_start'), // "22:00"
  quietHoursEnd: text('quiet_hours_end'),     // "08:00"
  quietHoursDays: text('quiet_hours_days').array(), // ["saturday", "sunday"]
  quietHoursTimezone: text('quiet_hours_timezone').default('America/Argentina/Buenos_Aires'),
  
  // Frecuencia de emails resumen
  emailDigestFrequency: text('email_digest_frequency', { 
    enum: ['immediate', 'hourly', 'daily', 'weekly', 'never'] 
  }).default('immediate'),
  
  // Email alternativo para notificaciones críticas
  alternateEmail: text('alternate_email'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Delivery log - tracking de intentos de entrega
 */
export const signalDeliveryLog = pgTable('signal_delivery_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  signalId: uuid('signal_id')
    .references(() => signals.id, { onDelete: 'cascade' })
    .notNull(),
  
  channel: signalDeliveryChannelEnum('channel').notNull(),
  status: text('status', { enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'] })
    .notNull(),
  
  // Detalles del intento
  attemptCount: integer('attempt_count').default(1),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  
  // Error tracking
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  
  // Metadata del delivery (ej: email_message_id, push_token, etc)
  deliveryMetadata: jsonb('delivery_metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  signalIdx: index('idx_signal_delivery_log_signal')
    .on(table.signalId),
  channelIdx: index('idx_signal_delivery_log_channel')
    .on(table.channel),
  statusIdx: index('idx_signal_delivery_log_status')
    .on(table.status),
}));

// Types para TypeScript
export type Signal = typeof signals.$inferSelect;
export type NewSignal = typeof signals.$inferInsert;
export type SignalPreference = typeof signalPreferences.$inferSelect;
export type NewSignalPreference = typeof signalPreferences.$inferInsert;
export type SignalDeliveryLog = typeof signalDeliveryLog.$inferSelect;
export type NewSignalDeliveryLog = typeof signalDeliveryLog.$inferInsert;
