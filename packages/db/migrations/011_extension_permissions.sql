-- Migration: Extension Permissions System
-- Hito: Sistema de permisos granulares para extensiones
-- 
-- Problema: Las extensiones se instalan pero los permisos no se asignan correctamente
-- Solución: Agregar campos de auditoría y control de permisos

-- Agregar campos a extension_installations
ALTER TABLE extension_installations
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES accounts(id),
ADD COLUMN IF NOT EXISTS can_share_permissions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS permissions_granted_at TIMESTAMP DEFAULT now();

-- Comentarios para documentación
COMMENT ON COLUMN extension_installations.granted_by IS 'Account que otorgó los permisos (null = auto-concedido por propietario)';
COMMENT ON COLUMN extension_installations.can_share_permissions IS 'Si esta cuenta puede delegar permisos de la extensión a colaboradores';
COMMENT ON COLUMN extension_installations.permissions_granted_at IS 'Timestamp de cuando se otorgaron los permisos';

-- Índice para búsquedas de permisos
CREATE INDEX IF NOT EXISTS idx_extension_installations_granted_by 
ON extension_installations(granted_by);
