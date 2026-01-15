-- Migration: Add asset permissions table for sharing assets
-- RAG-002: Sistema de Assets Centralizados
-- Date: 2026-01-14

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Create asset permissions table
-- ═══════════════════════════════════════════════════════════════════════════
-- Permite compartir assets (Vector Stores, Instructions, Tools) entre cuentas
-- Un asset puede tener múltiples permisos para diferentes cuentas

CREATE TABLE IF NOT EXISTS fluxcore_asset_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Asset referenciado (exactamente uno debe estar presente)
  vector_store_id UUID REFERENCES fluxcore_vector_stores(id) ON DELETE CASCADE,
  instruction_id UUID REFERENCES fluxcore_instructions(id) ON DELETE CASCADE,
  tool_definition_id UUID REFERENCES fluxcore_tool_definitions(id) ON DELETE CASCADE,
  
  -- Quién tiene acceso
  grantee_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Tipo de acceso
  permission_level VARCHAR(20) NOT NULL DEFAULT 'read',
  -- 'read': Puede usar el asset en sus asistentes
  -- 'write': Puede modificar contenido (añadir archivos a VS)
  -- 'admin': Puede cambiar permisos y eliminar
  
  -- Origen del permiso
  source VARCHAR(20) NOT NULL DEFAULT 'shared',
  -- 'shared': Compartido directamente por el owner
  -- 'marketplace': Adquirido del marketplace
  -- 'public': Asset público (cualquiera puede usarlo)
  
  -- Quién lo compartió
  granted_by_account_id UUID NOT NULL REFERENCES accounts(id),
  granted_at TIMESTAMP DEFAULT now() NOT NULL,
  expires_at TIMESTAMP,  -- NULL = no expira
  
  -- Metadata
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  -- Constraint: Exactamente un tipo de asset por registro
  CONSTRAINT chk_single_asset_type CHECK (
    (CASE WHEN vector_store_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN instruction_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN tool_definition_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Create unique constraints (un permiso por asset por cuenta)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_vs_grantee 
ON fluxcore_asset_permissions(vector_store_id, grantee_account_id) 
WHERE vector_store_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_inst_grantee 
ON fluxcore_asset_permissions(instruction_id, grantee_account_id) 
WHERE instruction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_tool_grantee 
ON fluxcore_asset_permissions(tool_definition_id, grantee_account_id) 
WHERE tool_definition_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Create indexes for common queries
-- ═══════════════════════════════════════════════════════════════════════════

-- Find all assets shared with a specific account
CREATE INDEX IF NOT EXISTS idx_permissions_grantee 
ON fluxcore_asset_permissions(grantee_account_id);

-- Find all permissions for a specific vector store
CREATE INDEX IF NOT EXISTS idx_permissions_vector_store 
ON fluxcore_asset_permissions(vector_store_id) WHERE vector_store_id IS NOT NULL;

-- Find all permissions for a specific instruction
CREATE INDEX IF NOT EXISTS idx_permissions_instruction 
ON fluxcore_asset_permissions(instruction_id) WHERE instruction_id IS NOT NULL;

-- Find all permissions for a specific tool
CREATE INDEX IF NOT EXISTS idx_permissions_tool 
ON fluxcore_asset_permissions(tool_definition_id) WHERE tool_definition_id IS NOT NULL;

-- Find permissions by source (for marketplace queries)
CREATE INDEX IF NOT EXISTS idx_permissions_source 
ON fluxcore_asset_permissions(source);

-- Find expired permissions (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_permissions_expires 
ON fluxcore_asset_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Add updated_at trigger
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_asset_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asset_permissions_updated_at ON fluxcore_asset_permissions;
CREATE TRIGGER trigger_asset_permissions_updated_at
  BEFORE UPDATE ON fluxcore_asset_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_permissions_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: Helper functions for permission checks
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if an account has access to a vector store
CREATE OR REPLACE FUNCTION check_vector_store_access(
  p_account_id UUID,
  p_vector_store_id UUID,
  p_required_level VARCHAR(20) DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_id UUID;
  v_permission_level VARCHAR(20);
  v_visibility VARCHAR(20);
BEGIN
  -- Check if account is the owner
  SELECT account_id, visibility INTO v_owner_id, v_visibility
  FROM fluxcore_vector_stores WHERE id = p_vector_store_id;
  
  IF v_owner_id = p_account_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if it's public
  IF v_visibility = 'public' THEN
    RETURN TRUE;
  END IF;
  
  -- Check explicit permissions
  SELECT permission_level INTO v_permission_level
  FROM fluxcore_asset_permissions
  WHERE vector_store_id = p_vector_store_id
    AND grantee_account_id = p_account_id
    AND (expires_at IS NULL OR expires_at > now());
  
  IF v_permission_level IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if permission level is sufficient
  IF p_required_level = 'read' THEN
    RETURN TRUE;
  ELSIF p_required_level = 'write' THEN
    RETURN v_permission_level IN ('write', 'admin');
  ELSIF p_required_level = 'admin' THEN
    RETURN v_permission_level = 'admin';
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Get all vector stores accessible by an account
CREATE OR REPLACE FUNCTION get_accessible_vector_stores(p_account_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  visibility VARCHAR(20),
  access_type VARCHAR(20),  -- 'owned', 'shared', 'marketplace', 'public'
  permission_level VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  -- Owned vector stores
  SELECT 
    vs.id,
    vs.name,
    vs.description,
    vs.visibility,
    'owned'::VARCHAR(20) as access_type,
    'admin'::VARCHAR(20) as permission_level
  FROM fluxcore_vector_stores vs
  WHERE vs.account_id = p_account_id
  
  UNION ALL
  
  -- Shared vector stores (via permissions)
  SELECT 
    vs.id,
    vs.name,
    vs.description,
    vs.visibility,
    p.source::VARCHAR(20) as access_type,
    p.permission_level
  FROM fluxcore_vector_stores vs
  INNER JOIN fluxcore_asset_permissions p ON p.vector_store_id = vs.id
  WHERE p.grantee_account_id = p_account_id
    AND (p.expires_at IS NULL OR p.expires_at > now())
    AND vs.account_id != p_account_id
  
  UNION ALL
  
  -- Public vector stores
  SELECT 
    vs.id,
    vs.name,
    vs.description,
    vs.visibility,
    'public'::VARCHAR(20) as access_type,
    'read'::VARCHAR(20) as permission_level
  FROM fluxcore_vector_stores vs
  WHERE vs.visibility = 'public'
    AND vs.account_id != p_account_id
    AND NOT EXISTS (
      SELECT 1 FROM fluxcore_asset_permissions p 
      WHERE p.vector_store_id = vs.id AND p.grantee_account_id = p_account_id
    );
END;
$$ LANGUAGE plpgsql;
