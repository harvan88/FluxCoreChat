-- Limpiar hardcoded settings en extension_installations para Daniel
-- Mantiener enabled:true pero elimina config personalizada

UPDATE extension_installations 
SET config = '{"enabled": true}'
WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' 
  AND extension_id = '@fluxcore/asistentes';

-- Verificación
SELECT account_id, extension_id, config FROM extension_installations 
WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' 
  AND extension_id = '@fluxcore/asistentes';
