CREATE SCHEMA IF NOT EXISTS monitoring;

CREATE OR REPLACE FUNCTION monitoring.check_account_references(target UUID)
RETURNS TABLE(
  table_name TEXT,
  column_name TEXT,
  row_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  match_count BIGINT;
BEGIN
  FOR rec IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name ILIKE '%account_id%'
    ORDER BY table_name, column_name
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE %I = $1', rec.table_name, rec.column_name)
      INTO match_count
      USING target;

    IF match_count > 0 THEN
      table_name := rec.table_name;
      column_name := rec.column_name;
      row_count := match_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION monitoring.check_account_references(UUID)
  IS 'Listado de tablas/columnas que referencian una cuenta y cantidad de filas asociadas.';
