import { 
  db, 
  conversations, 
  conversationParticipants, 
  relationships, 
  actors 
} from '@fluxcore/db';
import { eq, and, or } from 'drizzle-orm';

const SENDER_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const RECIPIENT_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';
const CONVERSATION_ID = 'e6a04794-e6a0-4794-bd66-16081ee3b02d';

async function setup() {
  console.log(`🛠️ CONFIGURANDO ENTORNO DE PRUEBA (CLEAN SLATE)...`);

  // 1. Obtener Actores
  const [senderActor] = await db.select().from(actors).where(eq(actors.accountId, SENDER_ACCOUNT_ID)).limit(1);
  const [recipientActor] = await db.select().from(actors).where(eq(actors.accountId, RECIPIENT_ACCOUNT_ID)).limit(1);

  if (!senderActor || !recipientActor) {
    console.error('❌ Error: No se encontraron los actores para las cuentas proporcionadas.');
    process.exit(1);
  }

  console.log(`✅ Actores identificados: User(${senderActor.id.slice(0,8)}) e IA(${recipientActor.id.slice(0,8)})`);

  // 2. Asegurar Relación
  let [rel] = await db.select().from(relationships).where(
    or(
      and(eq(relationships.actorAId, senderActor.id), eq(relationships.actorBId, recipientActor.id)),
      and(eq(relationships.actorAId, recipientActor.id), eq(relationships.actorBId, senderActor.id))
    )
  ).limit(1);

  if (!rel) {
    [rel] = await db.insert(relationships).values({
      actorAId: senderActor.id,
      actorBId: recipientActor.id,
      relationshipType: 'patient_provider',
      status: 'active'
    }).returning();
    console.log(`✅ Relación creada: ${rel.id}`);
  } else {
    console.log(`✅ Relación existente: ${rel.id}`);
  }

  // 3. Crear Conversación
  const [conv] = await db.insert(conversations).values({
    id: CONVERSATION_ID,
    relationshipId: rel.id,
    channel: 'webchat',
    conversationType: 'internal',
    status: 'active'
  }).onConflictDoNothing().returning();

  if (conv) {
    console.log(`✅ Conversación creada: ${conv.id}`);
  } else {
    console.log(`✅ La conversación ya existe o se mantuvo el ID.`);
  }

  // 4. Asegurar Participantes
  await db.insert(conversationParticipants).values([
    { conversationId: CONVERSATION_ID, accountId: SENDER_ACCOUNT_ID, actorId: senderActor.id, role: 'initiator' },
    { conversationId: CONVERSATION_ID, accountId: RECIPIENT_ACCOUNT_ID, actorId: recipientActor.id, role: 'recipient' }
  ]).onConflictDoNothing();

  console.log(`✅ Participantes sincronizados.`);
  console.log(`\n✨ ENTORNO LISTO PARA TELEMETRÍA.`);
}

setup().catch(console.error);
