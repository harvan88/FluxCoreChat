/**
 * COR-007: Automation Rules Schema
 * 
 * Define reglas de automatización por account/relationship.
 * Controla modos: automatic, supervised, disabled.
 */

import { pgTable, uuid, varchar, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { relationships } from './relationships';

/**
 * Modos de automatización según TOTEM 9.9.1
 */
export type AutomationMode = 'automatic' | 'supervised' | 'disabled';

/**
 * Tabla de configuración de automatización
 * 
 * Cada account puede tener una configuración global y
 * configuraciones específicas por relationship.
 */
export const automationRules = pgTable('automation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Scope de la regla
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Si relationshipId es null, es la configuración global del account
  relationshipId: uuid('relationship_id')
    .references(() => relationships.id, { onDelete: 'cascade' }),
  
  // Modo de automatización: automatic | supervised | disabled
  mode: varchar('mode', { length: 20 })
    .notNull()
    .default('supervised'),
  
  // Activo/inactivo
  enabled: boolean('enabled')
    .notNull()
    .default(true),
  
  // Configuración adicional (triggers, conditions, etc.)
  config: jsonb('config').$type<AutomationConfig>(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Configuración de automatización
 */
export interface AutomationConfig {
  // Triggers que activan la automatización
  triggers?: AutomationTrigger[];
  
  // Condiciones para aplicar la regla
  conditions?: AutomationCondition[];
  
  // Tiempo de espera antes de respuesta automática (ms)
  delayMs?: number;
  
  // Extensión específica a usar (null = core-ai)
  extensionId?: string | null;
  
  // Límite de respuestas automáticas por hora
  rateLimit?: number;
}

/**
 * Trigger de automatización
 */
export interface AutomationTrigger {
  type: 'message_received' | 'keyword' | 'schedule' | 'webhook';
  value?: string; // keyword pattern, cron expression, etc.
}

/**
 * Condición para aplicar regla
 */
export interface AutomationCondition {
  field: 'message_type' | 'sender' | 'time_of_day' | 'message_content';
  operator: 'equals' | 'contains' | 'regex' | 'between';
  value: string | string[];
}

// Type exports
export type AutomationRule = typeof automationRules.$inferSelect;
export type NewAutomationRule = typeof automationRules.$inferInsert;
