-- 053_sovereign_shield_v2.sql
-- Actualizacin de la proteccin contra borrados fsicos de activos (Sovereign Asset Shield v2)

-- 1. Actualizar la funcin del trigger
CREATE OR REPLACE FUNCTION prevent_asset_deletion()
RETURNS TRIGGER AS $$
DECLARE
    allowed_account text;
BEGIN
    -- Bypass total (Solo casos extremos/Root/SysAdmin)
    IF current_setting('fluxcore.allow_asset_deletion', true) = 'true' THEN
        RETURN OLD;
    END IF;

    -- Bypass granular (Seguro por cuenta)
    allowed_account := current_setting('fluxcore.allowed_delete_account_id', true);
    
    -- Si hay una cuenta autorizada en la sesin y coincide con el account_id de la fila que se est borrando:
    IF allowed_account IS NOT NULL AND allowed_account != '' AND OLD.account_id::text = allowed_account THEN
        RETURN OLD;
    END IF;

    -- Si no se cumple ninguna de las dos condiciones, se bloquea el borrado
    RAISE EXCEPTION 'SOVEREIGN_SHIELD_V2: Intento de borrado no autorizado. Cuenta requerida: %', OLD.account_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. El trigger 'protect_assets_from_deletion' ya existe y llama a esta funcin, 
-- por lo que reemplazar la funcin es suficiente para actualizar la lgica.
