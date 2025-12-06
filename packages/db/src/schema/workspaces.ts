/**
 * Workspaces Schema
 * 
 * Workspaces permiten colaboración en cuentas de negocio.
 * Una cuenta business puede tener un workspace con múltiples miembros.
 */

import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { users } from './users';

// Tabla de Workspaces
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerAccountId: uuid('owner_account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  settings: jsonb('settings').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabla de Miembros del Workspace
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  // Roles: 'owner', 'admin', 'operator', 'viewer'
  permissions: jsonb('permissions').default({}).notNull(),
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Invitaciones pendientes
export const workspaceInvitations = pgTable('workspace_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('operator'),
  token: varchar('token', { length: 100 }).notNull(),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tipos inferidos
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
export type NewWorkspaceInvitation = typeof workspaceInvitations.$inferInsert;

// Tipos de roles y permisos
export type WorkspaceRole = 'owner' | 'admin' | 'operator' | 'viewer';

export interface WorkspacePermissions {
  canManageMembers?: boolean;
  canManageSettings?: boolean;
  canViewAnalytics?: boolean;
  canRespondChats?: boolean;
  canViewChats?: boolean;
  canManageExtensions?: boolean;
}

// Permisos por defecto según rol
export const DEFAULT_PERMISSIONS: Record<WorkspaceRole, WorkspacePermissions> = {
  owner: {
    canManageMembers: true,
    canManageSettings: true,
    canViewAnalytics: true,
    canRespondChats: true,
    canViewChats: true,
    canManageExtensions: true,
  },
  admin: {
    canManageMembers: true,
    canManageSettings: true,
    canViewAnalytics: true,
    canRespondChats: true,
    canViewChats: true,
    canManageExtensions: true,
  },
  operator: {
    canManageMembers: false,
    canManageSettings: false,
    canViewAnalytics: false,
    canRespondChats: true,
    canViewChats: true,
    canManageExtensions: false,
  },
  viewer: {
    canManageMembers: false,
    canManageSettings: false,
    canViewAnalytics: true,
    canRespondChats: false,
    canViewChats: true,
    canManageExtensions: false,
  },
};
