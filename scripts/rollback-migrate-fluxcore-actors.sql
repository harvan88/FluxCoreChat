-- ========================================
-- ROLLBACK: Deshacer migración de actors
-- ========================================
-- Por si necesitas revertir los cambios

-- 1. Eliminar actors migrados (solo los nuevos tipos)
DELETE FROM actors 
WHERE actor_type IN ('visitor', 'account') 
AND id NOT IN (SELECT id FROM actors WHERE actor_type = 'user');

-- 2. Restaurar from_actor_id original (si conservaste fluxcore_actors)
-- Este paso solo funciona si NO eliminaste fluxcore_actors
UPDATE messages m
SET from_actor_id = fa.id::text
FROM fluxcore_actors fa
WHERE m.from_actor_id IN (
    SELECT id::text FROM actors WHERE actor_type IN ('visitor', 'account')
);

-- 3. Eliminar campos agregados (opcional)
ALTER TABLE actors DROP COLUMN IF EXISTS external_key;
ALTER TABLE actors DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE actors DROP COLUMN IF EXISTS linked_account_id;
ALTER TABLE actors DROP COLUMN IF EXISTS linked_at;
