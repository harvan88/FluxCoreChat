-- 052_sovereign_asset_shield.sql
-- Proteccin contra borrados fsicos de activos (Sovereign Asset Shield)

-- 1. Crear la funcin del trigger
CREATE OR REPLACE FUNCTION prevent_asset_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Se permite el borrado explcito si se estableci una variable de sesin "allow_asset_deletion = true"
    -- Esto es ǧtil para migraciones futuras o limpiezas extremas certificadas por admin.
    IF current_setting('fluxcore.allow_asset_deletion', true) = 'true' THEN
        RETURN OLD;
    END IF;

    -- Si no estǭ la variable, lanzamos un error bloqueante.
    RAISE EXCEPTION 'SOVEREIGN_SHIELD: La eliminacin fsica (DELETE) en la tabla assets estǭ PROHIBIDA. Use un UPDATE para cambiar el status a "deleted" o "archived".';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Asignar el trigger a la tabla assets
DROP TRIGGER IF EXISTS protect_assets_from_deletion ON assets;
CREATE TRIGGER protect_assets_from_deletion
BEFORE DELETE ON assets
FOR EACH ROW
EXECUTE FUNCTION prevent_asset_deletion();
