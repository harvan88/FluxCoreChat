-- ========================================
-- VERIFICACIÓN EMPÍRICA: Flujo ChatCore → Kernel
-- ========================================

-- 1. Verificar correlación Mensaje ↔ Signal (última hora)
SELECT 
  COUNT(*) as total_messages,
  COUNT(signal_id) as messages_with_signal,
  COUNT(*) - COUNT(signal_id) as orphaned_messages,
  ROUND((COUNT(signal_id)::float / COUNT(*) * 100), 2) as correlation_rate_percent
FROM messages 
WHERE generated_by = 'human'
  AND created_at >= NOW() - INTERVAL '1 hour';

-- 2. Verificar factTypes correctos (última hora)
SELECT 
  fact_type,
  COUNT(*) as count,
  ROUND(COUNT(*)::float / (SELECT COUNT(*) FROM fluxcore_signals WHERE created_at >= NOW() - INTERVAL '1 hour') * 100, 2) as percentage
FROM fluxcore_signals 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY fact_type
ORDER BY count DESC;

-- 3. Verificar samples de correlación directa
SELECT 
  m.id as message_id,
  m.conversation_id,
  m.sender_account_id,
  m.signal_id,
  s.sequence_number,
  s.fact_type,
  s.provenance_external_id,
  m.created_at as message_created,
  s.observed_at as signal_created,
  EXTRACT(EPOCH FROM (s.observed_at - m.created_at)) as time_diff_seconds
FROM messages m
LEFT JOIN fluxcore_signals s ON s.sequence_number = m.signal_id
WHERE m.generated_by = 'human'
  AND m.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY m.created_at DESC
LIMIT 10;

-- 4. Verificar outbox processing
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created,
  MAX(sent_at) as last_sent
FROM chatcore_outbox
GROUP BY status
ORDER BY status;

-- 5. Verificar que no hay signals huérfanos (sin mensaje correlacionado)
SELECT 
  COUNT(*) as orphaned_signals,
  fact_type
FROM fluxcore_signals s
LEFT JOIN messages m ON m.signal_id = s.sequence_number
WHERE m.id IS NULL
  AND s.created_at >= NOW() - INTERVAL '1 hour'
  AND s.fact_type = 'chatcore.message.received'
GROUP BY fact_type;

-- 6. Verificar flujo por canal (últimas 2 horas)
SELECT 
  COALESCE(NULLIF(m.meta->>'channel', 'unknown'), 'web') as channel,
  COUNT(*) as messages_count,
  COUNT(m.signal_id) as with_signal_count,
  ROUND((COUNT(m.signal_id)::float / COUNT(*) * 100), 2) as correlation_rate
FROM messages m
WHERE m.generated_by = 'human'
  AND m.created_at >= NOW() - INTERVAL '2 hours'
GROUP BY COALESCE(NULLIF(m.meta->>'channel', 'unknown'), 'web')
ORDER BY messages_count DESC;

-- 7. Verificar timestamps de certificación (debe ser < 5 segundos después del mensaje)
SELECT 
  AVG(EXTRACT(EPOCH FROM (s.observed_at - m.created_at))) as avg_certification_delay_seconds,
  MIN(EXTRACT(EPOCH FROM (s.observed_at - m.created_at))) as min_certification_delay_seconds,
  MAX(EXTRACT(EPOCH FROM (s.observed_at - m.created_at))) as max_certification_delay_seconds,
  COUNT(*) as sample_size
FROM messages m
JOIN fluxcore_signals s ON s.sequence_number = m.signal_id
WHERE m.generated_by = 'human'
  AND m.created_at >= NOW() - INTERVAL '1 hour'
  AND s.fact_type = 'chatcore.message.received';

-- ========================================
-- CRITERIOS DE ÉXITO
-- ========================================

-- El flujo es exitoso cuando:
-- 1. correlation_rate_percent >= 95% (95%+ de mensajes tienen signal)
-- 2. orphaned_messages = 0 (no hay mensajes huérfanos)
-- 3. fact_type = 'chatcore.message.received' para todos los mensajes nuevos
-- 4. avg_certification_delay_seconds < 5 (certificación rápida)
-- 5. No hay orphaned_signals con fact_type = 'chatcore.message.received'

-- ========================================
-- DEBUGGING ADICIONAL
-- ========================================

-- Verificar últimos 5 mensajes sin signal
SELECT 
  id,
  conversation_id,
  sender_account_id,
  external_id,
  meta->>'channel' as channel,
  created_at
FROM messages
WHERE generated_by = 'human'
  AND signal_id IS NULL
  AND created_at >= NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 5;

-- Verificar últimos 5 signals sin mensaje
SELECT 
  sequence_number,
  fact_type,
  provenance_external_id,
  evidence_raw->>'messageId' as message_id_in_evidence,
  observed_at
FROM fluxcore_signals
WHERE fact_type = 'chatcore.message.received'
  AND created_at >= NOW() - INTERVAL '30 minutes'
  AND sequence_number NOT IN (SELECT signal_id FROM messages WHERE signal_id IS NOT NULL)
ORDER BY observed_at DESC
LIMIT 5;
