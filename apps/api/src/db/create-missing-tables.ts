// CREAR TABLAS FALTANTES CHATCORE v1.3
// Solo crea conversation_participants y asset_enrichments

import { sql } from '@fluxcore/db';

async function createMissingTables() {
  console.log('🔧 CREANDO TABLAS FALTANTES CHATCORE v1.3');
  
  try {
    // 1. Conversation Participants
    console.log('\n=== 1. CONVERSATION_PARTICIPANTS ===');
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

    // 2. Asset Enrichments
    console.log('\n=== 2. ASSET_ENRICHMENTS ===');
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

    // 3. Índices para las nuevas tablas
    console.log('\n=== 3. ÍNDICES ===');
    
    // Conversation participants indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_cp_conversation ON conversation_participants(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cp_account ON conversation_participants(account_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cp_token ON conversation_participants(visitor_token) WHERE visitor_token IS NOT NULL`;
    
    console.log('✅ Índices: OK');

    console.log('\n🎯 ¡TABLAS FALTANTES CREADAS EXITOSAMENTE!');
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createMissingTables().catch(console.error);
