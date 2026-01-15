-- Migration: Add usage tracking and billing tables
-- RAG-010: Billing y Usage Tracking
-- Date: 2026-01-14

-- ═══════════════════════════════════════════════════════════════════════════
-- Usage Logs - Tracking de uso de recursos
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quién usó
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Qué se usó
  resource_type VARCHAR(50) NOT NULL,
  -- 'embedding', 'retrieval', 'document_processing', 'api_call'
  resource_id UUID,  -- ID del vector store, archivo, etc.
  
  -- Detalles de uso
  operation VARCHAR(50) NOT NULL,
  -- 'embed', 'search', 'chunk', 'upload', etc.
  
  -- Métricas
  tokens_used INTEGER DEFAULT 0,
  chunks_processed INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 1,
  processing_time_ms INTEGER DEFAULT 0,
  
  -- Costo
  cost_credits DECIMAL(10, 4) DEFAULT 0,
  
  -- Contexto
  provider VARCHAR(50),  -- 'openai', 'cohere', etc.
  model VARCHAR(100),
  
  -- Request metadata
  request_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  
  -- Período de facturación
  billing_period_start DATE,
  billing_period_end DATE
);

-- Índices para queries eficientes
CREATE INDEX IF NOT EXISTS idx_usage_account ON fluxcore_usage_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_usage_resource ON fluxcore_usage_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_usage_created ON fluxcore_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_billing_period ON fluxcore_usage_logs(billing_period_start, billing_period_end);

-- Particionamiento por fecha (para escalabilidad)
-- En producción, crear particiones mensuales

-- ═══════════════════════════════════════════════════════════════════════════
-- Account Credits - Créditos/saldo de la cuenta
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_account_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Saldo actual
  balance_credits DECIMAL(12, 4) DEFAULT 0,
  
  -- Límites
  monthly_limit_credits DECIMAL(12, 4),
  daily_limit_credits DECIMAL(12, 4),
  
  -- Uso del período actual
  used_this_month DECIMAL(12, 4) DEFAULT 0,
  used_today DECIMAL(12, 4) DEFAULT 0,
  
  -- Plan
  plan_type VARCHAR(50) DEFAULT 'free',
  -- 'free', 'starter', 'pro', 'enterprise'
  
  -- Stripe
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  -- Alertas
  alert_threshold_percent INTEGER DEFAULT 80,
  last_alert_sent_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  UNIQUE(account_id)
);

CREATE INDEX IF NOT EXISTS idx_credits_stripe ON fluxcore_account_credits(stripe_customer_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Credit Transactions - Historial de transacciones
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Tipo de transacción
  transaction_type VARCHAR(50) NOT NULL,
  -- 'purchase', 'usage', 'refund', 'bonus', 'subscription'
  
  -- Monto (positivo = añade créditos, negativo = resta)
  amount_credits DECIMAL(12, 4) NOT NULL,
  
  -- Descripción
  description TEXT,
  
  -- Referencias
  usage_log_id UUID REFERENCES fluxcore_usage_logs(id),
  subscription_id UUID REFERENCES fluxcore_marketplace_subscriptions(id),
  stripe_payment_intent_id VARCHAR(255),
  
  -- Balance después de la transacción
  balance_after DECIMAL(12, 4),
  
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON fluxcore_credit_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON fluxcore_credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON fluxcore_credit_transactions(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- Pricing Configuration - Configuración de precios
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recurso
  resource_type VARCHAR(50) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  provider VARCHAR(50),
  
  -- Precio
  price_per_unit DECIMAL(10, 6) NOT NULL,
  unit_type VARCHAR(50) NOT NULL,
  -- 'token', 'chunk', 'document', 'query', 'gb_month'
  
  -- Vigencia
  effective_from TIMESTAMP DEFAULT now() NOT NULL,
  effective_until TIMESTAMP,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Insertar precios por defecto
INSERT INTO fluxcore_pricing_config (resource_type, operation, provider, price_per_unit, unit_type) VALUES
  ('embedding', 'embed', 'openai', 0.0001, 'token'),
  ('embedding', 'embed', 'cohere', 0.00008, 'token'),
  ('retrieval', 'search', NULL, 0.001, 'query'),
  ('document_processing', 'chunk', NULL, 0.01, 'document'),
  ('storage', 'store', NULL, 0.05, 'gb_month')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger para actualizar credits updated_at
CREATE OR REPLACE FUNCTION update_account_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_account_credits_updated_at ON fluxcore_account_credits;
CREATE TRIGGER trigger_account_credits_updated_at
  BEFORE UPDATE ON fluxcore_account_credits
  FOR EACH ROW EXECUTE FUNCTION update_account_credits_updated_at();

-- Función para registrar uso y descontar créditos
CREATE OR REPLACE FUNCTION log_usage_and_deduct(
  p_account_id UUID,
  p_resource_type VARCHAR,
  p_operation VARCHAR,
  p_tokens_used INTEGER DEFAULT 0,
  p_provider VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  usage_log_id UUID,
  credits_deducted DECIMAL,
  remaining_balance DECIMAL
) AS $$
DECLARE
  v_price DECIMAL;
  v_cost DECIMAL;
  v_log_id UUID;
  v_balance DECIMAL;
BEGIN
  -- Obtener precio
  SELECT price_per_unit INTO v_price
  FROM fluxcore_pricing_config
  WHERE resource_type = p_resource_type
    AND operation = p_operation
    AND (provider = p_provider OR provider IS NULL)
    AND is_active = true
  ORDER BY provider NULLS LAST, effective_from DESC
  LIMIT 1;
  
  v_price := COALESCE(v_price, 0);
  
  -- Calcular costo
  v_cost := v_price * p_tokens_used;
  
  -- Crear log
  INSERT INTO fluxcore_usage_logs (
    account_id, resource_type, operation, 
    tokens_used, cost_credits, provider
  ) VALUES (
    p_account_id, p_resource_type, p_operation,
    p_tokens_used, v_cost, p_provider
  ) RETURNING id INTO v_log_id;
  
  -- Descontar créditos
  UPDATE fluxcore_account_credits
  SET 
    balance_credits = balance_credits - v_cost,
    used_this_month = used_this_month + v_cost,
    used_today = used_today + v_cost
  WHERE account_id = p_account_id
  RETURNING balance_credits INTO v_balance;
  
  -- Registrar transacción
  INSERT INTO fluxcore_credit_transactions (
    account_id, transaction_type, amount_credits,
    description, usage_log_id, balance_after
  ) VALUES (
    p_account_id, 'usage', -v_cost,
    p_operation || ' (' || p_tokens_used || ' tokens)',
    v_log_id, v_balance
  );
  
  RETURN QUERY SELECT v_log_id, v_cost, COALESCE(v_balance, 0::DECIMAL);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener uso del mes actual
CREATE OR REPLACE FUNCTION get_monthly_usage(p_account_id UUID)
RETURNS TABLE (
  resource_type VARCHAR,
  total_tokens BIGINT,
  total_cost DECIMAL,
  operation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.resource_type,
    SUM(u.tokens_used)::BIGINT as total_tokens,
    SUM(u.cost_credits) as total_cost,
    COUNT(*)::BIGINT as operation_count
  FROM fluxcore_usage_logs u
  WHERE u.account_id = p_account_id
    AND u.created_at >= date_trunc('month', now())
  GROUP BY u.resource_type;
END;
$$ LANGUAGE plpgsql;
