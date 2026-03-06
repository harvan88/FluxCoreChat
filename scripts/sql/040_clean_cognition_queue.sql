-- Limpiar cognition_queue - marcar todos los turns pendientes como procesados
UPDATE fluxcore_cognition_queue 
SET processed_at = NOW() 
WHERE processed_at IS NULL;

-- Verificar limpieza
SELECT 'Turns pendientes despues de limpieza:' as status, COUNT(*) as count
FROM fluxcore_cognition_queue 
WHERE processed_at IS NULL;
