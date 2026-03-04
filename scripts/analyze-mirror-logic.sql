-- Análisis del problema de lógica de espejo entre cuentas
-- Basado en los logs del usuario y el TOTEM.md

-- Problema identificado:
-- 1. Dos cuentas diferentes están en la misma conversación
-- 2. ace5d88a-1a80-4f43-805b-f31184e59595 envía mensajes
-- 3. a9611c11-70f2-46cd-baef-6afcde715f3a recibe notificaciones
-- 4. Según TOTEM.md, cada cuenta es un mundo diferente

-- Análisis de la arquitectura según TOTEM.md:
-- PERSONA -> puede tener múltiples CUENTAS
-- CUENTA -> identidad pública única (@username)
-- RELATIONSHIP -> vínculo bilateral entre DOS cuentas
-- CONVERSATION -> existe dentro de una relationship

-- El problema: ¿Cómo pueden hablar cuentas diferentes si son "mundos diferentes"?

-- Respuesta del TOTEM.md (líneas 200-205):
-- "Si @gustavo, @ana, @marina chatean entre ellos → conversación PERSONAL
--  Esa conversación NO aparece en @panaderialaesquina
--  Son cuentas diferentes, aunque operen la misma empresa"

-- EXPLICACIÓN:
-- Las cuentas pueden hablar entre sí porque:
-- 1. Son identidades públicas en el mismo sistema FluxCore
-- 2. Una RELATIONSHIP conecta dos cuentas (como agregar contacto en WhatsApp)
-- 3. Cada cuenta tiene su propia perspectiva de la relación
-- 4. La conversación es compartida pero cada cuenta tiene su vista

-- Lo que significa "cada cuenta es un mundo diferente":
-- - Contexto privado: cada cuenta tiene su propio private_context (5000 chars)
-- - Perfil público: cada cuenta tiene su propio profile
-- - Extensiones: cada cuenta instala y configura sus propias extensiones
-- - IA: cada cuenta tiene su propia configuración de IA

-- Lo que es compartido:
-- - Messages: los mensajes existen en la conversación compartida
-- - Relationship context: contexto compartido entre las dos cuentas (2000 chars)
-- - Conversation: la misma conversación para ambas cuentas

-- El problema real en los logs:
-- ace5d88a-1a80-4f43-805b-f31184e59595 envía mensaje
-- a9611c11-70f2-46cd-baef-6afcde715f3a recibe notificación de typing

-- Esto es CORRECTO según la arquitectura:
-- Son dos cuentas en la misma conversación (relationship)
-- Cada una recibe notificaciones de los eventos de la otra

-- Consulta para verificar:
SELECT 
  a.id,
  a.owner_user_id,
  a.username,
  a.display_name,
  r.id as relationship_id,
  r.account_a_id,
  r.account_b_id
FROM accounts a
JOIN relationships r ON (r.account_a_id = a.id OR r.account_b_id = a.id)
WHERE a.id IN ('ace5d88a-1a80-4f43-805b-f31184e59595', 'a9611c11-70f2-46cd-baef-6afcde715f3a');

-- Verificar conversación compartida:
SELECT 
  c.id,
  c.relationship_id,
  c.channel,
  m.sender_account_id,
  m.content,
  m.created_at
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
WHERE c.relationship_id IN (
  SELECT id FROM relationships 
  WHERE account_a_id = 'ace5d88a-1a80-4f43-805b-f31184e59595' 
     OR account_b_id = 'ace5d88a-1a80-4f43-805b-f31184e59595'
)
ORDER BY m.created_at DESC;
