-- Migration: 009_credits_policies_seed
-- Context: asegura políticas base para providers IA (ver 6. MIGRATIONS_REASONING_PROTOCOL.md)

-- OpenAI · gpt-4o-mini (plan default)
INSERT INTO credits_policies (feature_key, engine, model, cost_credits, token_budget, duration_hours, active)
SELECT 'ai_session', 'openai_chat', 'gpt-4o-mini-2024-07-18', 1, 120000, 24, true
WHERE NOT EXISTS (
  SELECT 1 FROM credits_policies
  WHERE feature_key = 'ai_session'
    AND engine = 'openai_chat'
    AND model = 'gpt-4o-mini-2024-07-18'
);

-- Groq · llama-3.1-8b-instant (plan fallback)
INSERT INTO credits_policies (feature_key, engine, model, cost_credits, token_budget, duration_hours, active)
SELECT 'ai_session', 'groq_chat', 'llama-3.1-8b-instant', 1, 120000, 24, true
WHERE NOT EXISTS (
  SELECT 1 FROM credits_policies
  WHERE feature_key = 'ai_session'
    AND engine = 'groq_chat'
    AND model = 'llama-3.1-8b-instant'
);
