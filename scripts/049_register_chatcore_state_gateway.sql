-- Registrar ChatCore State Gateway como Reality Adapter autorizado
-- Migration: 049_register_chatcore_state_gateway.sql

-- Insertar el adapter en la tabla de adapters autorizados
INSERT INTO fluxcore_reality_adapters (
  adapter_id,
  driver_id,
  adapter_class,
  description,
  signing_secret,
  adapter_version,
  created_at
) VALUES (
  'chatcore-state-gateway',
  'chatcore/message-state',
  'GATEWAY',
  'ChatCore State Gateway - Certifica mutaciones estructurales de ChatCore',
  'chatcore-state-dev-secret',
  '1.0.0',
  NOW()
) ON CONFLICT (adapter_id) DO UPDATE SET
  driver_id = EXCLUDED.driver_id,
  adapter_class = EXCLUDED.adapter_class,
  description = EXCLUDED.description,
  signing_secret = EXCLUDED.signing_secret,
  adapter_version = EXCLUDED.adapter_version,
  created_at = EXCLUDED.created_at;

-- Verificar que el adapter fue registrado correctamente
SELECT 
  adapter_id,
  driver_id,
  adapter_class,
  description,
  adapter_version,
  created_at
FROM fluxcore_reality_adapters 
WHERE adapter_id = 'chatcore-state-gateway';
