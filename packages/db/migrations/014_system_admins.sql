CREATE TABLE IF NOT EXISTS system_admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  scopes JSONB NOT NULL DEFAULT jsonb_build_object('credits', true),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
