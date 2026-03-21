-- Limpiar timing_config de campos que pertenecen a modelConfig
UPDATE fluxcore_assistants 
SET timing_config = '{"mode":"auto","smartDelay":false,"responseDelaySeconds":2}'
WHERE timing_config::text LIKE '%tone%' OR timing_config::text LIKE '%language%' OR timing_config::text LIKE '%useEmojis%';
