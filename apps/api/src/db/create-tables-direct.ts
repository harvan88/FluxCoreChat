// CREACIÓN DIRECTA DE TABLAS CHATCORE v1.3
// Versión simple y robusta

import { sql } from '@fluxcore/db';

async function createTablesDirect() {
  console.log('🔧 CREACIÓN DIRECTA DE TABLAS CHATCORE v1.3');
  
  try {
    // 1. Users
    console.log('\n=== 1. USERS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          last_login_at TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB DEFAULT '{}'::jsonb
      )
    `;
    console.log('✅ Users: OK');

    // 2. Accounts
    console.log('\n=== 2. ACCOUNTS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          username VARCHAR(100) UNIQUE NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('personal', 'business')),
          profile JSONB DEFAULT '{}'::jsonb,
          avatar_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          CONSTRAINT accounts_username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
          CONSTRAINT accounts_display_name_length CHECK (LENGTH(display_name) >= 1)
      )
    `;
    console.log('✅ Accounts: OK');

    // 3. Relationships
    console.log('\n=== 3. RELATIONSHIPS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS relationships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_a_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          account_b_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          relationship_type VARCHAR(20) NOT NULL DEFAULT 'contact',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          context JSONB DEFAULT '{"entries": []}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT no_self_relationship CHECK (account_a_id != account_b_id),
          UNIQUE (account_a_id, account_b_id)
      )
    `;
    console.log('✅ Relationships: OK');

    // 4. Conversations
    console.log('\n=== 4. CONVERSATIONS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
          conversation_type VARCHAR(32) NOT NULL DEFAULT 'internal',
          channel VARCHAR(32) NOT NULL DEFAULT 'web',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          frozen_at TIMESTAMPTZ,
          frozen_by TEXT,
          frozen_reason TEXT,
          last_message_at TIMESTAMPTZ,
          last_message_text TEXT,
          metadata JSONB DEFAULT '{}'::jsonb,
          visitor_token TEXT,
          identity_linked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT conversation_type_valid CHECK (conversation_type IN ('internal', 'anonymous_thread', 'external')),
          CONSTRAINT conversation_channel_valid CHECK (channel IN ('web', 'whatsapp', 'telegram', 'webchat', 'external')),
          CONSTRAINT conversation_status_valid CHECK (status IN ('active', 'archived', 'closed'))
      )
    `;
    console.log('✅ Conversations: OK');

    // 5. Conversation Participants
    console.log('\n=== 5. CONVERSATION_PARTICIPANTS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS conversation_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          account_id TEXT NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('initiator', 'recipient', 'observer')),
          identity_type VARCHAR(20) NOT NULL DEFAULT 'registered',
          visitor_token TEXT,
          subscribed_at TIMESTAMPTZ DEFAULT NOW(),
          unsubscribed_at TIMESTAMPTZ,
          UNIQUE (conversation_id, account_id)
      )
    `;
    console.log('✅ Conversation Participants: OK');

    // 6. Messages
    console.log('\n=== 6. MESSAGES ===');
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          signal_id TEXT UNIQUE,
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_account_id TEXT NOT NULL,
          generated_by VARCHAR(20) NOT NULL DEFAULT 'human',
          event_type VARCHAR(20) NOT NULL DEFAULT 'message',
          content JSONB NOT NULL,
          parent_id UUID REFERENCES messages(id),
          original_id UUID REFERENCES messages(id),
          version INT NOT NULL DEFAULT 1,
          is_current BOOLEAN NOT NULL DEFAULT true,
          deleted_at TIMESTAMPTZ,
          deleted_by TEXT,
          deleted_scope VARCHAR(10) CHECK (deleted_scope IN ('self', 'all')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT message_has_content CHECK (
              content->>'text' IS NOT NULL
              OR jsonb_array_length(COALESCE(content->'media', '[]'::jsonb)) > 0
              OR event_type IN ('reaction', 'system')
          ),
          CONSTRAINT message_event_type_valid CHECK (event_type IN ('message', 'reaction', 'edit', 'internal_note', 'system')),
          CONSTRAINT message_generated_by_valid CHECK (generated_by IN ('human', 'ai', 'system'))
      )
    `;
    console.log('✅ Messages: OK');

    // 7. Asset Enrichments
    console.log('\n=== 7. ASSET_ENRICHMENTS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS asset_enrichments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asset_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          payload JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (asset_id, type)
      )
    `;
    console.log('✅ Asset Enrichments: OK');

    // 8. Índices básicos
    console.log('\n=== 8. ÍNDICES ===');
    
    // Messages indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_account_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id) WHERE parent_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_original ON messages(original_id) WHERE original_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_signal ON messages(signal_id) WHERE signal_id IS NOT NULL`;
    
    // Conversation participants indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_cp_conversation ON conversation_participants(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cp_account ON conversation_participants(account_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cp_token ON conversation_participants(visitor_token) WHERE visitor_token IS NOT NULL`;
    
    // Conversations indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_relationship ON conversations(relationship_id) WHERE relationship_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_visitor ON conversations(visitor_token) WHERE visitor_token IS NOT NULL`;
    
    console.log('✅ Índices: OK');

    console.log('\n🎯 ¡SCHEMA CHATCORE CREADO EXITOSAMENTE!');
    console.log('📋 Características v1.3 implementadas:');
    console.log('   ✅ sender_account_id como TEXT');
    console.log('   ✅ Soft delete (deleted_at, deleted_by, deleted_scope)');
    console.log('   ✅ Versionamiento (parent_id, original_id, version, is_current)');
    console.log('   ✅ Conversaciones congelables (frozen_at, frozen_by, frozen_reason)');
    console.log('   ✅ conversation_participants como fuente de verdad');
    console.log('   ✅ Asset enrichments separados');
    
  } catch (error) {
    console.error('❌ Error creando schema:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createTablesDirect().catch(console.error);
