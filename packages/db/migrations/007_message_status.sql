-- COR-002: Añadir campo status a messages
-- Status de sincronización/entrega del mensaje

-- Añadir columna status con valor por defecto 'synced'
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'synced';

-- Comentario explicativo de valores posibles
COMMENT ON COLUMN messages.status IS 'Status del mensaje: local_only, pending_backend, synced, sent, delivered, seen';

-- Crear índice para búsquedas por status
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Crear índice compuesto para sincronización eficiente
CREATE INDEX IF NOT EXISTS idx_messages_conversation_status ON messages(conversation_id, status);
