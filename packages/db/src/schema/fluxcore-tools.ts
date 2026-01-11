/**
 * FluxCore: Tools Schema
 * 
 * Herramientas disponibles para los asistentes.
 * Pueden ser internas (del sistema) o conexiones a servicios externos.
 */

import { pgTable, uuid, varchar, timestamp, text, jsonb, boolean } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * Configuración de autenticación para herramientas externas
 */
export interface ToolAuthConfig {
  type: 'oauth2' | 'api_key' | 'none';
  clientId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
}

/**
 * Definición de herramientas del sistema (plantillas)
 */
export const fluxcoreToolDefinitions = pgTable('fluxcore_tool_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Identificación
  slug: varchar('slug', { length: 100 }).notNull().unique(), // 'google_calendar', 'file_search', etc.
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(), // 'agenda', 'storage', 'communication', etc.
  icon: varchar('icon', { length: 100 }), // Nombre del icono de Lucide
  
  // Clasificación
  type: varchar('type', { length: 20 }).notNull().default('internal'), // 'mcp', 'http', 'internal'
  visibility: varchar('visibility', { length: 20 }).notNull().default('public'), // 'private', 'shared', 'public', 'marketplace'

  // Definición
  schema: jsonb('schema'), // JSON Schema / OpenAPI spec
  
  // Configuración
  authType: varchar('auth_type', { length: 20 }).notNull().default('none'), // 'oauth2', 'api_key', 'none'
  oauthProvider: varchar('oauth_provider', { length: 100 }), // 'google', 'microsoft', etc.
  
  // Disponibilidad
  isBuiltIn: boolean('is_built_in').default(false).notNull(), // Si es herramienta del sistema
  isEnabled: boolean('is_enabled').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreToolDefinition = typeof fluxcoreToolDefinitions.$inferSelect;
export type NewFluxcoreToolDefinition = typeof fluxcoreToolDefinitions.$inferInsert;

/**
 * Conexiones de herramientas por cuenta
 */
export const fluxcoreToolConnections = pgTable('fluxcore_tool_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  toolDefinitionId: uuid('tool_definition_id')
    .notNull()
    .references(() => fluxcoreToolDefinitions.id, { onDelete: 'cascade' }),
  
  // Estado de conexión
  status: varchar('status', { length: 20 }).notNull().default('disconnected'), // 'connected', 'disconnected', 'error'
  errorMessage: text('error_message'),
  
  // Autenticación
  authConfig: jsonb('auth_config').$type<ToolAuthConfig>().default({
    type: 'none',
  }).notNull(),
  
  // Metadata
  lastUsedAt: timestamp('last_used_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreToolConnection = typeof fluxcoreToolConnections.$inferSelect;
export type NewFluxcoreToolConnection = typeof fluxcoreToolConnections.$inferInsert;

/**
 * Relación muchos a muchos: Asistentes <-> Herramientas
 */
export const fluxcoreAssistantTools = pgTable('fluxcore_assistant_tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  assistantId: uuid('assistant_id').notNull(),
  toolConnectionId: uuid('tool_connection_id')
    .notNull()
    .references(() => fluxcoreToolConnections.id, { onDelete: 'cascade' }),
  
  // Configuración específica para este asistente
  isEnabled: boolean('is_enabled').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type FluxcoreAssistantTool = typeof fluxcoreAssistantTools.$inferSelect;
export type NewFluxcoreAssistantTool = typeof fluxcoreAssistantTools.$inferInsert;
