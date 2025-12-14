-- Migration: 012_media_attachments
-- Hito PC-9: File Upload System (Generic)

CREATE TABLE IF NOT EXISTS media_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'document', 'audio', 'video', 'location', 'contact')),
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  waveform_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON media_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON media_attachments(type);
