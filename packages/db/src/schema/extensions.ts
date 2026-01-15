/**
 * Schema: Extension Installations
 * FC-150: Registro de extensiones instaladas por cuenta
 */

import { pgTable, uuid, varchar, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * Tabla de instalaciones de extensiones
 * Cada cuenta puede tener múltiples extensiones instaladas
 */
export const extensionInstallations = pgTable('extension_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Cuenta que tiene instalada la extensión
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  
  // Identificador de la extensión (e.g., "@fluxcore/fluxcore")
  extensionId: varchar('extension_id', { length: 100 }).notNull(),
  
  // Versión instalada
  version: varchar('version', { length: 50 }).notNull(),
  
  // Estado de la extensión
  enabled: boolean('enabled').default(true).notNull(),
  
  // Configuración específica de la cuenta (sobrescribe defaults del manifest)
  config: jsonb('config').default({}).$type<Record<string, any>>(),
  
  // Permisos concedidos (subconjunto de los solicitados)
  grantedPermissions: jsonb('granted_permissions').default([]).$type<string[]>(),
  
  // Sistema de permisos granulares
  grantedBy: uuid('granted_by').references(() => accounts.id),
  canSharePermissions: boolean('can_share_permissions').default(true),
  permissionsGrantedAt: timestamp('permissions_granted_at').defaultNow(),
  
  // Timestamps
  installedAt: timestamp('installed_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Tipos inferidos para extension_installations
 */
export type ExtensionInstallation = typeof extensionInstallations.$inferSelect;
export type NewExtensionInstallation = typeof extensionInstallations.$inferInsert;
