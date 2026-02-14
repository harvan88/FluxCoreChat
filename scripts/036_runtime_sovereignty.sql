-- 036_runtime_sovereignty.sql
-- Fase 5: Dimensión 1 - Configuración de Runtime (Soberanía de Cuenta)
-- Crea la tabla maestra para definir quién procesa los mensajes por cuenta.

CREATE TABLE IF NOT EXISTS public.account_runtime_config (
    account_id uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
    active_runtime_id varchar(100) NOT NULL DEFAULT '@fluxcore/fluxcore',
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Comentario para auditoría
COMMENT ON TABLE public.account_runtime_config IS 'Centraliza la configuración de ejecución (Runtime) por cuenta. Define WES o Agentes.';
