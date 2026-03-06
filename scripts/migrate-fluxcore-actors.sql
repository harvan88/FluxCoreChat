-- ========================================
-- MIGRATION: fluxcore_actors → actors
-- ========================================
-- Entorno DEV - se pueden eliminar mensajes si es necesario

-- 1. Agregar campos faltantes a actors
ALTER TABLE actors ADD COLUMN IF NOT EXISTS external_key text;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES accounts(id);
ALTER TABLE actors ADD COLUMN IF NOT EXISTS linked_account_id uuid REFERENCES accounts(id);
ALTER TABLE actors ADD COLUMN IF NOT EXISTS linked_at timestamp;

-- 2. Crear mapa de conversión de IDs
CREATE TEMP TABLE fluxcore_to_actors_map AS
SELECT 
    fa.id as fluxcore_id,
    gen_random_uuid() as new_actor_id
FROM fluxcore_actors fa;

-- 3. Migrar fluxcore_actors a actors con nuevos IDs
INSERT INTO actors (
    id,
    actor_type,
    external_key,
    tenant_id,
    account_id,
    display_name,
    created_at,
    linked_account_id,
    linked_at
)
SELECT 
    map.new_actor_id,
    CASE fa.type 
        WHEN 'provisional' THEN 'visitor' 
        WHEN 'real' THEN 'account' 
        ELSE 'unknown'
    END,
    fa.external_key,
    CASE 
        WHEN fa.tenant_id IS NOT NULL THEN fa.tenant_id::uuid 
        ELSE NULL 
    END,
    CASE 
        WHEN fa.type = 'real' AND fa.external_key IS NOT NULL THEN fa.external_key::uuid
        ELSE NULL 
    END,
    CASE 
        WHEN fa.type = 'real' AND fa.external_key IS NOT NULL THEN CONCAT('Account ', SUBSTRING(fa.external_key::text, 1, 8))
        WHEN fa.type = 'provisional' THEN CONCAT('Visitor ', SUBSTRING(fa.external_key, 1, 12))
        ELSE 'Unknown Actor'
    END,
    fa.created_at,
    CASE 
        WHEN fa.type = 'real' AND fa.external_key IS NOT NULL THEN fa.external_key::uuid
        ELSE NULL 
    END,
    fa.created_at
FROM fluxcore_actors fa
JOIN fluxcore_to_actors_map map ON fa.id = map.fluxcore_id;

-- 4. Actualizar messages.from_actor_id para que apunten a nuevos actors.id
UPDATE messages 
SET from_actor_id = map.new_actor_id::text
FROM fluxcore_to_actors_map map
WHERE messages.from_actor_id = map.fluxcore_id;

-- 5. Verificación
SELECT 'Actors originales' as table_name, COUNT(*) as count FROM fluxcore_actors
UNION ALL
SELECT 'Actors migrados', COUNT(*) FROM actors WHERE actor_type IN ('visitor', 'account')
UNION ALL
SELECT 'Messages actualizados', COUNT(*) FROM messages WHERE from_actor_id IS NOT NULL;

-- 6. Opcional: Limpiar tablas de FluxCore (solo en DEV)
-- DELETE FROM fluxcore_actor_identity_links;
-- DELETE FROM fluxcore_actor_address_links;
-- DELETE FROM fluxcore_account_actor_contexts;
-- DELETE FROM fluxcore_actors;

-- 7. Opcional: Eliminar mensajes con from_actor_id (si quieres limpiar completamente)
-- DELETE FROM messages WHERE from_actor_id IS NOT NULL;

-- 8. Drop temp table
DROP TABLE fluxcore_to_actors_map;
