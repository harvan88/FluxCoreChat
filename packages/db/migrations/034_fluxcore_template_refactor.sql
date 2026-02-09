-- 034_fluxcore_template_refactor.sql
-- Separar configuración de FluxCore IA de la tabla core de templates.

-- 1. Crear nueva tabla
CREATE TABLE IF NOT EXISTS fluxcore_template_settings (
    template_id uuid PRIMARY KEY REFERENCES templates(id) ON DELETE CASCADE,
    authorize_for_ai boolean NOT NULL DEFAULT false,
    ai_usage_instructions text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Migrar datos existentes (authorize_for_ai)
-- Solo si la columna existe en templates (bloque defensivo)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'templates' AND column_name = 'authorize_for_ai'
    ) THEN
        INSERT INTO fluxcore_template_settings (template_id, authorize_for_ai)
        SELECT id, authorize_for_ai FROM templates
        ON CONFLICT (template_id) DO UPDATE
        SET authorize_for_ai = EXCLUDED.authorize_for_ai;
    END IF;
END $$;

-- 3. Eliminar columna antigua
ALTER TABLE templates DROP COLUMN IF EXISTS authorize_for_ai;
