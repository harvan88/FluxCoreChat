-- Limpieza de cuenta Daniel (a9611c11-70f2-46cd-baef-6afcde715f3a)
-- Mantener conversaciones y relaciones, limpiar hardcodes

-- 1. Resetear asistente activo a configuración por defecto
UPDATE fluxcore_assistants 
SET 
  model_config = '{"topP": 1, "model": "llama-3.1-8b-instant", "provider": "groq", "temperature": 0.7, "responseFormat": "text"}',
  timing_config = '{"mode": "auto", "smartDelay": true, "responseDelaySeconds": 2}',
  updated_at = NOW()
WHERE id = '5bbac0a1-0249-4230-a635-13f916296db9';

-- 2. Eliminar asistentes en estado draft (mantener solo el activo)
DELETE FROM fluxcore_assistants 
WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' 
AND status = 'draft';

-- 3. Eliminar instrucciones en draft (mantener solo la activa)
DELETE FROM fluxcore_instructions 
WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' 
AND status = 'draft';

-- 4. Eliminar vector stores en draft (mantener solo los completed)
DELETE FROM fluxcore_vector_stores 
WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' 
AND status = 'draft';

-- 5. Verificación final
SELECT 'Asistentes restantes:' as info, COUNT(*) as count FROM fluxcore_assistants WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
UNION ALL
SELECT 'Instrucciones restantes:', COUNT(*) FROM fluxcore_instructions WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
UNION ALL
SELECT 'Vector stores restantes:', COUNT(*) FROM fluxcore_vector_stores WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
UNION ALL
SELECT 'Conversaciones mantenidas:', COUNT(*) FROM conversations WHERE owner_account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a';
