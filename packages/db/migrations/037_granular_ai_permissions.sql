ALTER TABLE fluxcore_template_settings
ADD COLUMN ai_include_name BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN ai_include_content BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN ai_include_instructions BOOLEAN NOT NULL DEFAULT TRUE;
