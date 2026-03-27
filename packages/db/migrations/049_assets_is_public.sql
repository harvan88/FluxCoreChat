-- Añadiendo soporte de acceso público para archivos (Google Docs mode).
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;
