UPDATE fluxcore_assistants 
SET authorized_data_scopes = ARRAY['displayName', 'bio', 'privateContext'] 
WHERE id = '5bbac0a1-0249-4230-a635-13f916296db9';
