-- 035: AI Persistence — traces, signals, suggestions
-- Fase 2 del roadmap FluxCore
-- Fecha: 2026-02-09

BEGIN;

-- 1. AI Traces (reemplaza Map en memoria de la extensión FluxCore)
CREATE TABLE IF NOT EXISTS ai_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  runtime VARCHAR(20) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  model VARCHAR(100) NOT NULL,
  mode VARCHAR(20) NOT NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  request_body JSONB,
  response_content TEXT,

  tools_offered JSONB DEFAULT '[]',
  tools_called JSONB DEFAULT '[]',
  tool_details JSONB,

  attempts JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_traces_account ON ai_traces(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_traces_conversation ON ai_traces(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_traces_created_at ON ai_traces(created_at DESC);

-- 2. AI Signals (etiquetado interno por asistentes para analytics/ML)
CREATE TABLE IF NOT EXISTS ai_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES ai_traces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships(id) ON DELETE SET NULL,

  signal_type VARCHAR(30) NOT NULL,
  signal_value VARCHAR(100) NOT NULL,
  confidence REAL DEFAULT 1.0,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_signals_account ON ai_signals(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_signals_type_value ON ai_signals(signal_type, signal_value);
CREATE INDEX IF NOT EXISTS idx_ai_signals_conversation ON ai_signals(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_signals_created_at ON ai_signals(created_at DESC);

-- 3. AI Suggestions (reemplaza Map en memoria de ai-suggestion-store.ts)
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(20),
  base_url VARCHAR(255),
  trace_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_conversation ON ai_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_account ON ai_suggestions(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at ON ai_suggestions(created_at DESC);

COMMIT;
