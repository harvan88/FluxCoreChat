-- 036_policy_context_authorization.sql
-- Adds allow_automated_use column to multiple tables to support Policy Context authorization mechanism.
-- Date: 2026-02-16

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS allow_automated_use BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS allow_automated_use BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE website_configs ADD COLUMN IF NOT EXISTS allow_automated_use BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE appointment_services ADD COLUMN IF NOT EXISTS allow_automated_use BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE appointment_staff ADD COLUMN IF NOT EXISTS allow_automated_use BOOLEAN DEFAULT false NOT NULL;
