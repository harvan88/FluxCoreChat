/**
 * Migration Script: All Tables
 * Ejecuta todas las migraciones en orden
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/fluxcore';
const sql = postgres(connectionString);

// Migración 001: Users
const migration001 = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

// Migración 002: Accounts
const migration002 = `
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  avatar_url VARCHAR(500),
  bio TEXT,
  account_type VARCHAR(20) DEFAULT 'personal' NOT NULL,
  public_context JSONB DEFAULT '{}'::jsonb,
  private_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
`;

// Migración 003: Core (relationships, conversations, messages)
const migration003 = `
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_a_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  account_b_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  context JSONB DEFAULT '{"entries":[]}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(account_a_id, account_b_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID REFERENCES relationships(id) ON DELETE SET NULL,
  channel VARCHAR(50) DEFAULT 'direct' NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'text' NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_relationships_accounts ON relationships(account_a_id, account_b_id);
CREATE INDEX IF NOT EXISTS idx_conversations_relationship ON conversations(relationship_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
`;

// Migración 004: Extensions
const migration004 = `
CREATE TABLE IF NOT EXISTS extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  version VARCHAR(20) NOT NULL,
  description TEXT,
  author VARCHAR(255),
  enabled BOOLEAN DEFAULT true NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS extension_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  context_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(extension_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_extensions_name ON extensions(name);
CREATE INDEX IF NOT EXISTS idx_extension_contexts_extension ON extension_contexts(extension_id);
CREATE INDEX IF NOT EXISTS idx_extension_contexts_account ON extension_contexts(account_id);
`;

// Migración 005: Appointments
const migration005 = `
CREATE TABLE IF NOT EXISTS appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS appointment_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  availability JSONB DEFAULT '{}'::jsonb,
  services JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  service_id UUID REFERENCES appointment_services(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES appointment_staff(id) ON DELETE SET NULL,
  client_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_account ON appointment_services(account_id);
CREATE INDEX IF NOT EXISTS idx_staff_account ON appointment_staff(account_id);
CREATE INDEX IF NOT EXISTS idx_appointments_account ON appointments(account_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
`;

// Migración 006: Workspaces
const migration006 = `
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  settings JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
  permissions JSONB DEFAULT '{}'::jsonb NOT NULL,
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT now() NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  token VARCHAR(100) NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
`;

const migrations = [
  { name: '001_users', sql: migration001 },
  { name: '002_accounts', sql: migration002 },
  { name: '003_core', sql: migration003 },
  { name: '004_extensions', sql: migration004 },
  { name: '005_appointments', sql: migration005 },
  { name: '006_workspaces', sql: migration006 },
];

async function migrate() {
  console.log('🔄 Running all migrations...\n');
  
  for (const migration of migrations) {
    try {
      console.log(`  ▶️  ${migration.name}...`);
      await sql.unsafe(migration.sql);
      console.log(`  ✅ ${migration.name} completed`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`  ℹ️  ${migration.name} (tables exist)`);
      } else {
        console.error(`  ❌ ${migration.name} failed:`, error.message);
      }
    }
  }
  
  console.log('\n✅ All migrations completed!');
  await sql.end();
  process.exit(0);
}

migrate();
