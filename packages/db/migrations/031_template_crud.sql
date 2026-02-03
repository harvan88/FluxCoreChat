-- Templates CRUD backend: create templates table and FK with template_assets

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  content text NOT NULL,
  category varchar(100),
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_account ON templates(account_id);
CREATE INDEX IF NOT EXISTS idx_templates_account_name ON templates(account_id, name);

DO $$
BEGIN
  ALTER TABLE template_assets
    ADD CONSTRAINT template_assets_template_fk
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
