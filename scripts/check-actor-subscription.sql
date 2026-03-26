-- Verificar suscripción de actores a conversación
-- Reemplazar 'b4b58580-b589-4cc4-a1db-7e4122140a25' con el conversationId real

SELECT 
    cp.id,
    cp.conversationId,
    cp.accountId,
    cp.actorId,
    cp.role,
    cp.identityType,
    cp.subscribedAt,
    cp.unsubscribedAt,
    a.actorType,
    a.externalKey
FROM conversation_participants cp
LEFT JOIN actors a ON cp.actorId = a.id
WHERE cp.conversationId = 'b4b58580-b589-4cc4-a1db-7e4122140a25'
ORDER BY cp.subscribedAt DESC;

-- También verificar los mensajes más recientes
SELECT 
    id,
    senderAccountId,
    fromActorId,
    content->>'text' as message_text,
    createdAt,
    generatedBy
FROM messages 
WHERE conversationId = 'b4b58580-b589-4cc4-a1db-7e4122140a25'
ORDER BY createdAt DESC
LIMIT 5;
