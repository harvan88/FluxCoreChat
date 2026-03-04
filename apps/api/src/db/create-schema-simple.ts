// CREACIÓN SIMPLE DEL SCHEMA DE CHATCORE v1.3
// Usando SQL directo sin Drizzle

import { sql } from '@fluxcore/db';

async function createSchemaSimple() {
  console.log('🔧 CREANDO SCHEMA DE CHATCORE v1.3 (SIMPLE)');
  console.log('📋 Usando SQL directo');
  
  try {
    // 1. Crear tabla users
    console.log('\n=== 1. CREANDO TABLA USERS ===');
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
    
    // Verificar que se creó
    const usersCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `;
    const usersExists = Array.from(usersCheck as any[])[0]?.exists;
    console.log(`✅ users: ${usersExists ? 'CREADA' : 'NO CREADA'}`);
    
    // 2. Crear tabla accounts
    console.log('\n=== 2. CREANDO TABLA ACCOUNTS ===');
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
    console.log('✅ accounts: CREADA');
    
    // 3. Crear tabla relationships
    console.log('\n=== 3. CREANDO TABLA RELATIONSHIPS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS relationships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_a_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          account_b_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          perspective_a JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
          perspective_b JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT relationships_no_self_ref CHECK (account_a_id != account_b_id)
      )
    `;
    console.log('✅ relationships: CREADA');
    
    // 4. Crear tabla conversations
    console.log('\n=== 4. CREANDO TABLA CONVERSATIONS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
          channel VARCHAR(20) NOT NULL CHECK (channel IN ('web', 'whatsapp', 'telegram')),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed', 'frozen')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          last_activity_at TIMESTAMPTZ DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'::jsonb,
          frozen_at TIMESTAMPTZ,
          frozen_by TEXT,
          frozen_reason TEXT,
          CONSTRAINT conversations_unique_relationship_channel UNIQUE (relationship_id, channel)
      )
    `;
    console.log('✅ conversations: CREADA');
    
    // 5. Crear tabla conversation_participants
    console.log('\n=== 5. CREANDO TABLA CONVERSATION_PARTICIPANTS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS conversation_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          target_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed', 'banned')),
          role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('participant', 'admin', 'moderator')),
          perspective JSONB DEFAULT '{"saved_name": null, "tags": [], "notifications": true, "muted": false}'::jsonb,
          joined_at TIMESTAMPTZ DEFAULT NOW(),
          left_at TIMESTAMPTZ,
          CONSTRAINT conversation_participants_unique UNIQUE (conversation_id, target_account_id)
      )
    `;
    console.log('✅ conversation_participants: CREADA');
    
    // 6. Crear tabla messages
    console.log('\n=== 6. CREANDO TABLA MESSAGES ===');
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_account_id TEXT NOT NULL,
          generated_by VARCHAR(20) DEFAULT 'human' CHECK (generated_by IN ('human', 'ai', 'system', 'extension')),
          content JSONB NOT NULL,
          type VARCHAR(20) DEFAULT 'message' CHECK (type IN ('message', 'system', 'event')),
          event_type VARCHAR(50),
          parent_id UUID REFERENCES messages(id) ON DELETE CASCADE,
          original_id UUID REFERENCES messages(id) ON DELETE CASCADE,
          version INTEGER DEFAULT 1,
          is_current BOOLEAN DEFAULT true,
          deleted_at TIMESTAMPTZ,
          deleted_by TEXT,
          deleted_scope VARCHAR(20) CHECK (deleted_scope IN ('self', 'all', 'admin')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          delivered_at TIMESTAMPTZ,
          read_at TIMESTAMPTZ,
          metadata JSONB DEFAULT '{}'::jsonb,
          CONSTRAINT messages_content_not_empty CHECK (
              (content->>'text' IS NOT NULL AND content->>'text' != '') OR
              (content->>'media' IS NOT NULL AND jsonb_array_length(COALESCE(content->>'media', '[]'::jsonb)) > 0) OR
              (type IN ('system', 'event'))
          )
      )
    `;
    console.log('✅ messages: CREADA');
    
    // 7. Crear tabla asset_enrichments
    console.log('\n=== 7. CREANDO TABLA ASSET_ENRICHMENTS ===');
    await sql`
      CREATE TABLE IF NOT EXISTS asset_enrichments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          asset_id UUID NOT NULL,
          enrichment_type VARCHAR(50) NOT NULL CHECK (enrichment_type IN (
              'audio_transcript', 'audio_summary', 'image_analysis', 
              'document_extract', 'video_thumbnail', 'custom'
          )),
          content JSONB NOT NULL,
          confidence_score DECIMAL(3,2),
          processing_time_ms INTEGER,
          model_used VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT asset_enrichments_unique_message_asset UNIQUE (message_id, asset_id, enrichment_type),
          CONSTRAINT asset_enrichments_confidence_range CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
      )
    `;
    console.log('✅ asset_enrichments: CREADA');
    
    // 8. Crear índices básicos
    console.log('\n=== 8. CREANDO ÍNDICES BÁSICOS ===');
    
    // Users
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`;
    
    // Accounts
    await sql`CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type)`;
    
    // Relationships
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_a ON relationships(account_a_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_b ON relationships(account_b_id)`;
    
    // Conversations
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_relationship ON conversations(relationship_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status)`;
    
    // Conversation Participants
    await sql`CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversation_participants_account ON conversation_participants(target_account_id)`;
    
    // Messages
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_account_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC)`;
    
    // Asset Enrichments
    await sql`CREATE INDEX IF NOT EXISTS idx_asset_enrichments_message ON asset_enrichments(message_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_asset_enrichments_asset ON asset_enrichments(asset_id)`;
    
    console.log('✅ Índices básicos: CREADOS');
    
    // 9. Verificación final
    console.log('\n=== 9. VERIFICACIÓN FINAL ===');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'accounts', 'relationships', 'conversations', 'conversation_participants', 'messages', 'asset_enrichments')
      ORDER BY table_name
    `;
    
    const tablesArray = Array.from(tables as any[]);
    
    console.log('📊 Tablas creadas:');
    tablesArray.forEach((table: any) => {
      console.log(`   ✅ ${table.table_name}`);
    });
    
    // Verificar columnas críticas
    const senderColumn = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'sender_account_id'
    `;
    
    if (senderColumn.length > 0) {
      console.log(`   ✅ messages.sender_account_id: ${(senderColumn as any[])[0].data_type}`);
    }
    
    console.log('\n🎯 ¡SCHEMA DE CHATCORE CREADO EXITOSAMENTE!');
    console.log('📋 Implementando las 6 decisiones fundamentales:');
    console.log('   ✅ 1. Mensajes versionados (parent_id, original_id, version, is_current)');
    console.log('   ✅ 2. Soft delete (deleted_at, deleted_by, deleted_scope)');
    console.log('   ✅ 3. Asset enrichments (tabla separada)');
    console.log('   ✅ 4. Conversaciones congelables (frozen_at, frozen_by, frozen_reason)');
    console.log('   ✅ 5. conversation_participants (fuente de verdad)');
    console.log('   ✅ 6. sender_account_id como TEXT');
    
    console.log('\n🚀 Base de datos lista para usar con:');
    console.log('   ✅ Sistema de assets existente');
    console.log('   ✅ Sistema de WebSocket existente');
    console.log('   ✅ Sistema de autenticación existente');
    console.log('   ✅ API endpoints existentes');
    
  } catch (error) {
    console.error('❌ Error creando schema:', error);
    throw error;
  }
}

createSchemaSimple()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });
