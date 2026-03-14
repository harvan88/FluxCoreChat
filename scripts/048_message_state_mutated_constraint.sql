-- Extender constraint para incluir MESSAGE_STATE_MUTATED
-- Migration: 048_message_state_mutated_constraint.sql

-- Primero eliminar constraint existente si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_fact_types'
        AND table_catalog = 'fluxcore'
        AND table_name = 'fluxcore_signals'
        AND constraint_type = 'CHECK'
    ) THEN
        ALTER TABLE fluxcore_signals DROP CONSTRAINT chk_fact_types;
    END IF;
END $$;

-- Luego agregar constraint extendido con el nuevo fact type
ALTER TABLE fluxcore_signals 
ADD CONSTRAINT chk_fact_types_extended 
CHECK (fact_type IN (
  'EXTERNAL_INPUT_OBSERVED',
  'EXTERNAL_STATE_OBSERVED',
  'DELIVERY_SIGNAL_OBSERVED',
  'MEDIA_CAPTURED',
  'SYSTEM_TIMER_ELAPSED',
  'CONNECTION_EVENT_OBSERVED',
  'chatcore.message.received',
  'AI_RESPONSE_GENERATED',
  'MESSAGE_STATE_MUTATED'
));

-- Verificar que el constraint fue creado correctamente
SELECT 
    tc.constraint_name,
    tc.check_clause
FROM information_schema.check_constraints tc
JOIN information_schema.table_constraints tco 
    ON tc.constraint_name = tco.constraint_name
WHERE tco.table_name = 'fluxcore_signals'
    AND tc.constraint_name = 'chk_fact_types_extended';
