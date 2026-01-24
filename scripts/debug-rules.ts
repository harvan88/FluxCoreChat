
import { db, messages, automationRules, relationships, conversations } from '@fluxcore/db';
import { eq, desc, and, isNull } from 'drizzle-orm';

async function main() {
    console.log('🕵️‍♂️ INSPECTOR DE ESTADO FLUXCORE');

    // 1. Buscar el último mensaje (probablemente el del test)
    const [lastMsg] = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(1);
    if (!lastMsg) { console.log('No hay mensajes.'); process.exit(0); }

    console.log(`\n📨 Último Mensaje Detectado:`);
    console.log(`   ID: ${lastMsg.id}`);
    const contentStr = typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content);
    console.log(`   Texto: ${contentStr.substring(0, 100)}...`);
    console.log(`   Conv ID: ${lastMsg.conversationId}`);
    console.log(`   Type: ${lastMsg.type}`);
    console.log(`   GeneratedBy: ${lastMsg.generatedBy}`);

    // 2. Buscar la Relación
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, lastMsg.conversationId));
    if (!conv) { console.error('Conversación no encontrada'); process.exit(1); }

    const [rel] = await db.select().from(relationships).where(eq(relationships.id, conv.relationshipId));
    if (!rel) { console.error('Relación no encontrada'); process.exit(1); }

    const relId = conv.relationshipId;
    const accountId = rel.accountAId; // Asumimos A es el Tenant

    console.log(`\n🔗 Contexto:`);
    console.log(`   Conversation ID: ${conv.id}`);
    console.log(`   Relationship ID: ${relId}`);
    console.log(`   Account ID:      ${accountId}`);

    // 3. Buscar Reglas
    console.log('\n📜 Reglas en Base de Datos:');

    const rules = await db.select().from(automationRules)
        .where(eq(automationRules.accountId, accountId));

    const globalRule = rules.find(r => r.relationshipId === null);
    const specificRule = rules.find(r => r.relationshipId === relId);

    console.log(`   Global Rule:    ${globalRule ? `[${globalRule.mode.toUpperCase()}] (Enabled: ${globalRule.enabled})` : 'NO DEFINIDA'}`);
    console.log(`   Specific Rule:  ${specificRule ? `[${specificRule.mode.toUpperCase()}] (Enabled: ${specificRule.enabled})` : 'NO DEFINIDA'}`);

    // 4. Determinación
    console.log('\n🧠 Análisis de Lógica:');
    let effectiveMode = 'disabled';

    if (specificRule) {
        effectiveMode = specificRule.enabled ? specificRule.mode : 'disabled';
        console.log(`   -> Usa Regla Específica: ${effectiveMode}`);
    } else if (globalRule) {
        effectiveMode = globalRule.enabled ? globalRule.mode : 'disabled';
        console.log(`   -> Usa Regla Global: ${effectiveMode}`);
    } else {
        console.log(`   -> Sin reglas, por defecto: disabled`);
    }

    if (effectiveMode === 'automatic') {
        console.log('\n✅ RESULTADO: El sistema ESTÁ CONFIGURADO para responder.');
        console.log('   Si no hubo respuesta, verifica:');
        console.log('   1. ¿El mensaje entrante fue reconocido como "incoming"? (Type: ' + lastMsg.type + ')');
        console.log('   2. ¿El servicio AI Orchestrator está escuchando eventos?');
        console.log('   3. ¿Hay créditos/API Key válida?');
    } else {
        console.log(`\n⛔ RESULTADO: El sistema NO responderá porque el modo efectivo es ${effectiveMode}.`);
    }

    process.exit(0);
}

main().catch(console.error);
