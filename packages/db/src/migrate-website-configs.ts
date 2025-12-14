/**
 * Migration Script: Website Configs
 * Extension Karen - Website Builder
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/fluxcore';
const sql = postgres(connectionString);

const migration007 = `
CREATE TABLE IF NOT EXISTS website_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con cuenta (una config por cuenta)
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Estado del sitio: draft, published, archived
  status VARCHAR(20) NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Configuración del sitio (site.config.yaml parseado)
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Array de páginas MDX
  pages JSONB NOT NULL DEFAULT '[]',
  
  -- Metadatos de build
  last_build_at TIMESTAMP,
  build_hash VARCHAR(64),
  published_at TIMESTAMP,
  
  -- Dominio personalizado (opcional)
  custom_domain VARCHAR(255),
  custom_domain_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_website_configs_account ON website_configs(account_id);
CREATE INDEX IF NOT EXISTS idx_website_configs_status ON website_configs(status);
CREATE INDEX IF NOT EXISTS idx_website_configs_custom_domain ON website_configs(custom_domain) WHERE custom_domain IS NOT NULL;

-- Comentarios
COMMENT ON TABLE website_configs IS 'Configuración de sitios web estáticos por cuenta (Extension Karen)';
COMMENT ON COLUMN website_configs.config IS 'site.config.yaml parseado como JSONB';
COMMENT ON COLUMN website_configs.pages IS 'Array de páginas MDX con frontmatter y contenido';
`;

async function migrate() {
  console.log('🔄 Running website_configs migration...\n');
  
  try {
    await sql.unsafe(migration007);
    console.log('✅ website_configs table created successfully!');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  website_configs table already exists');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }
  
  await sql.end();
  process.exit(0);
}

migrate();
