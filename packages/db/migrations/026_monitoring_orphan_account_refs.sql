CREATE OR REPLACE FUNCTION monitoring.list_account_reference_orphans(sample_limit integer DEFAULT 5)
RETURNS TABLE(
  table_name TEXT,
  column_name TEXT,
  orphan_count BIGINT,
  sample_ids UUID[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  cnt BIGINT;
  samples UUID[];
BEGIN
  FOR rec IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name ILIKE '%account_id%'
    ORDER BY table_name, column_name
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I t
        LEFT JOIN accounts a ON a.id = t.%I
        WHERE t.%I IS NOT NULL AND a.id IS NULL',
      rec.table_name,
      rec.column_name,
      rec.column_name
    )
    INTO cnt;

    IF cnt > 0 THEN
      EXECUTE format(
        'SELECT COALESCE(array_agg(val), ARRAY[]::uuid[])
         FROM (
           SELECT DISTINCT t.%I AS val
           FROM %I t
           LEFT JOIN accounts a ON a.id = t.%I
           WHERE t.%I IS NOT NULL AND a.id IS NULL
           LIMIT %s
         ) AS sample_values',
        rec.column_name,
        rec.table_name,
        rec.column_name,
        rec.column_name,
        sample_limit
      )
      INTO samples;

      table_name := rec.table_name;
      column_name := rec.column_name;
      orphan_count := cnt;
      sample_ids := samples;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION monitoring.list_account_reference_orphans(integer)
  IS 'Devuelve tablas/columnas con referencias a account_id cuya cuenta ya no existe, incluyendo muestra de UUIDs.';
